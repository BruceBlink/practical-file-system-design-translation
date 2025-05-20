---
typora-root-url: ./..\..\public\
---



# Vnode 层 (The Vnode Layer)

一个操作系统几乎总是有其自身的本地文件系统格式，但仍然经常需要访问其他类型的文件系统。例如，CD-ROM 介质经常使用 ISO-9660 文件系统来存储数据，并且能够访问这些信息是可取的。此外，还有许多其他原因使得访问不同的文件系统成为必需：数据传输、互操作性和简单的便利性。所有这些原因对于 BeOS 尤其如此，因为它必须与许多其他操作系统共存。

BeOS（以及大多数 Unix 版本）为方便访问不同文件系统所采用的方法是设置一个文件系统独立层，该层协调对不同文件系统的访问。该层通常被称为虚拟文件系统层或 vnode（虚拟节点）层。“vnode 层”这一术语起源于 Unix。vnode 是文件或目录的通用表示，对应于真实文件系统中的 i-node。vnode 层为内核的其余部分提供了访问文件和目录的统一接口，而无论底层文件系统是什么。

vnode 层通过定义一组由每个文件系统实现的函数，将特定文件系统的实现与系统的其余部分分离开来。vnode 层定义的这组函数抽象了文件和目录的通用概念。每个文件系统都实现这些函数，并将每个通用操作映射到在特定文件系统格式中执行该操作的细节。

本章描述 BeOS vnode 层、它支持的操作、期望文件系统遵循的协议，以及有关文件描述符实现及其如何映射到 vnode 的一些细节。

## 10.1 背景 (Background)

要理解 BeOS vnode 层，首先描述 BeOS vnode 层运行的框架会很有帮助。BeOS 内核管理线程 (threads) 和团队 (teams)（Unix 术语中的“进程”），但文件描述符和所有 I/O 都完全属于 vnode 层的 purview。图 10-1 说明了 vnode 层如何与内核的其余部分以及几个文件系统相结合。vnode 层通过文件描述符与用户程序交互，并通过 vnode 操作与不同的文件系统通信。在图 10-1 中，有三个文件系统（BFS、Macintosh HFS 和 NFS）。

![figure10-1](/images/chapter10/figure10-1.png)

BeOS 中的 vnode 层完全隐藏了管理文件描述符的细节，内核的其余部分对此毫不知情。文件描述符是按线程管理的。BeOS 线程结构为每个线程维护一个指向 I/O 上下文 (I/O context) 的指针 `ioctx`。`ioctx` 结构对于内核的其余部分是不透明的；只有 vnode 层知道它。`ioctx` 结构中包含了 vnode 层所需的所有信息。

![figure10-2](/images/chapter10/figure10-2.png)

图 10-2 说明了协同工作以支持用户级别文件描述符概念的所有结构。虽然整体结构看起来复杂，但每个部分都非常简单。为了描述该结构，我们将从 `thread_rec` 结构开始，并贯穿整个图示，一直到由底层文件系统使用的结构。

每个线程都有其自己的 `ioctx` 结构。`ioctx` 包含一个指向每个线程当前工作目录 (cwd) 的指针、一个指向打开文件描述符数组 (`fdarray`) 的指针，以及一个受监控 vnode 列表 (`mon`；我们稍后将讨论这一点)。`fdarray` 维护有关文件描述符的状态，但主要成员是一个指针 `fds`，它指向一个 `ofile` 结构数组。`fdarray` 在同一团队中的所有线程之间共享。每个 `ofile` 维护有关文件打开方式（只读等）和文件中的位置的信息。然而，`ofile` 结构中最有趣的字段是 `vn` 指针。`vn` 字段指向一个 `vnode` 结构，这是 vnode 层的最低级别。

每个 `vnode` 结构是文件或目录的抽象表示。`vnode` 结构的 `data` 成员保存一个指针，该指针引用有关该 vnode 的文件系统特定信息。`data` 字段是文件或目录的抽象概念与特定文件系统上文件或目录的具体细节之间的连接。vnode 的 `ns` 字段指向一个名称空间 (name space) 结构，该结构保存有关此文件或目录所在文件系统的通用信息。名称空间结构还以类似于 vnode 的 `data` 字段的方式，保存一个指向每个文件系统特定结构的指针。

关于这个整体结构有几个关键点。一个团队中的每个线程都有一个指向同一个 `fdarray` 的指针，这意味着同一团队中的所有线程共享文件描述符。`fdarray` 中的每个条目都指向一个 `ofile` 结构，该结构又指向一个 `vnode`。`fdarray` 中的不同条目可以指向同一个 `ofile` 结构。POSIX 调用 `dup()` 依赖于此功能才能复制文件描述符。类似地，不同的 `ofile` 结构可以指向同一个 `vnode`，这对应于能够在同一程序或不同程序中多次打开文件的能力。在 `ofile` 结构中维护的信息与其引用的 `vnode` 之间的分离非常重要。

关于上图需要注意的另一件重要事情是，每个 `vnode` 结构都有一个 `vnode-id`。在 BeOS 中，每个 `vnode` 都有一个 `vnode-id`，它在单个文件系统上唯一地标识一个文件。为方便起见，我们将术语“vnode-id”缩写为“vnid”。给定一个 `vnid`，文件系统应该能够访问文件的 i-node。相反，给定目录中的一个名称，文件系统应该能够返回该文件的 `vnid`。

为了更好地理解如何使用此结构，让我们考虑一个在文件描述符上实际执行 write() 操作的具体示例。这一切都始于用户线程执行以下代码行：

```c
write(4, "hello world\n", 12);
```

在用户空间，函数 `write()` 是一个陷入内核的系统调用。一旦进入内核模式，内核系统调用处理程序将控制权传递给实现 `write()` 系统调用的内核例程。内核 `write()` 调用，即 `sys_write()`，是 vnode 层的一部分。从调用线程的 `ioctx` 结构开始，`sys_write()` 使用整数文件描述符（在本例中为值 4）来索引文件描述符数组 `fdarray`（由 `ioctx` 指向）。索引到 `fdarray` 会产生一个指向 `ofile` 结构的指针。`ofile` 结构包含状态信息（例如我们在文件中的当前位置）以及一个指向与此文件描述符关联的底层 `vnode` 的指针。`vnode` 结构引用特定的 `vnode`，并且还有一个指向包含有关此 `vnode` 所在文件系统信息的结构的指针。包含文件系统信息的结构有一个指向此文件系统支持的函数表的指针，以及一个由文件系统提供的文件系统状态结构。vnode 层使用函数指针表来调用文件系统的 `write()`，并使用适当的参数将数据写入与文件描述符关联的文件。

尽管这看起来像一条迂回且缓慢的路径，但这条从用户级别通过 vnode 层一直到特定文件系统的路径发生得非常频繁，并且必须相当高效。这个例子在许多方面都进行了简化（例如，我们根本没有讨论锁定），但它有助于演示从用户空间进入内核，然后通过特定文件系统的流程。

BeOS vnode 层还管理文件系统名称空间，并处理安装和卸载文件系统的所有方面。BeOS vnode 层维护已安装文件系统的列表以及它们在名称空间中的安装位置。此信息对于管理程序在层次结构中遍历时从一个文件系统透明地移动到另一个文件系统是必需的。

尽管 BeOS 的 vnode 层相当广泛，但它也与内核的其余部分高度封装。这种分离有助于在发生错误时隔离错误（vnode 层中的错误通常不会损坏线程其余部分的状态），并将 I/O 子系统中的更改与影响内核其余部分分离开来。这种 I/O 管理与系统其他方面（线程管理、VM 等）的清晰分离使用起来非常令人愉快。

## 10.2 Vnode 层概念 (Vnode Layer Concepts)

Vnode 层最重要的概念是 vnode。在 vnode 层本身内部，vnode 是一个抽象实体，由一个 64 位的 `vnid` 唯一标识。Vnode 层假设文件系统中的每个命名实体都有一个唯一的 `vnid`。给定一个 `vnid`，vnode 层可以请求文件系统加载相应的节点。

### 私有数据 (Private Data)

当 vnode 层请求文件系统加载特定的 `vnid` 时，它允许文件系统将一个指向私有数据的指针与该 `vnid` 相关联。文件系统在其 `read_vnode()` 例程中创建此私有数据结构。一旦 `vnid` 加载到内存中，vnode 层在调用文件系统以引用该节点时，总是传递文件系统的私有数据指针。每个 `vnode` 结构都有一个引用计数。当引用计数达到零时，vnode 层可以将该节点从内存中刷新，此时会调用文件系统以释放与私有数据相关的任何资源。

重要的是要注意，每个 vnode（以及关联的私有数据）在某种意义上是全局的，即许多操作同一文件的线程将使用相同的 `vnode` 结构。这就要求如果要修改该节点，则必须对其进行锁定，并且，该数据结构不适合存储特定于某个文件描述符的状态信息。

Vnode 层操作名称、`vnid` 和 vnode。当 vnode 层需要与文件系统通信时，它要么请求名称对应的 `vnid`，要么传递文件的 `vnid`，要么传递一个指向与某个 `vnid` 对应的 vnode 的文件系统私有数据的指针。文件系统从不直接看到 `vnode` 结构。相反，文件系统接收到的要么是一个 `vnid`，要么是当 vnode 层请求它加载 `vnid` 时它自己分配的每个节点的数据结构。Vnode 层和文件系统之间的接口仅将文件系统特定的信息传递给文件系统，而文件系统仅向 vnode 层发出涉及 `vnid` 的请求。

除了每个 vnode 保存的文件系统特定信息之外，vnode 层还允许文件系统提供一个对整个文件系统全局的结构。此结构包含有关文件系统特定实例的状态信息。Vnode 层总是将此结构传递给 vnode 层 API 定义的所有接口操作。因此，有了这个全局信息和每个 vnode 的信息，每个文件系统操作都只处理其自己的数据结构。同样，vnode 层也只处理其自己的结构，仅仅是调用文件系统特定层，并传递指向对 vnode 层不透明的文件系统特定信息的指针。

### Cookie (Cookies)

某些 vnode 层操作要求文件系统维护特定于单个文件描述符的状态信息。必须按文件描述符维护的状态不能保存在 vnode 的私有数据区域中，因为 `vnode` 结构是全局的。为了支持每个文件描述符的私有数据，vnode 层引入了“cookie”的概念。Cookie 是一个指向文件系统在连续调用其函数之间所需的私有状态信息的指针。Cookie 使得文件系统可以为每个文件描述符维护状态，尽管文件系统本身从不直接看到文件描述符。只有文件系统操作 cookie 的内容。Cookie 对 vnode 层是不透明的。Vnode 层仅跟踪 cookie，并在每个需要它的操作中将其传递给文件系统。

Vnode 层明确规定 cookie 的所有权由文件系统负责。文件系统分配一个 cookie 并填充其数据结构。Vnode 层跟踪指向该 cookie 的指针。Vnode 层确保文件系统在每个需要 cookie 的操作中都能接收到指向 cookie 的指针，但 vnode 层从不检查 cookie 的内容。当不再有对 cookie 的未完成引用时，vnode 层会请求文件系统释放与该 cookie 相关的资源。分配 cookie、管理其中的数据以及释放它的责任完全属于文件系统的范畴。

### Vnode 概念总结 (Vnode Concepts Summary)

每个 `vnid` 的数据结构、每个文件系统的状态结构以及 cookie 的概念有助于将 vnode 层与任何特定文件系统的具体细节隔离开来。这些结构中的每一个都存储与文件和文件系统相关的明确定义的信息片段。每个 `vnid` 的数据结构存储有关供所有人使用的文件的信息（例如文件大小）。每个文件系统的结构存储对整个文件系统全局的信息（例如卷上的块数）。Cookie 存储特定于某个文件描述符的私有信息（例如文件中的当前位置）。

## 10.3 Vnode 层支持例程 (Vnode Layer Support Routines)

除了文件系统实现的 API 之外，vnode 层还有几个支持例程，文件系统使用这些例程来正确实现 vnode 层 API。Vnode 层的支持例程包括：

```c
int new_vnode(nspace_id nsid, vnode_id vnid, void *data);
int get_vnode(nspace_id nsid, vnode_id vnid, void **data);
int put_vnode(nspace_id nsid, vnode_id vnid);
int remove_vnode(nspace_id nsid, vnode_id vnid);
int unremove_vnode(nspace_id nsid, vnode_id vnid);
int is_vnode_removed(nspace_id nsid, vnode_id vnid);
```

这些调用管理从 vnode 层的活动 vnode 池中创建、加载、卸载和移除 `vnid`。这些例程操作 `vnid` 以及一个关联的指向文件系统特定数据的指针。`new_vnode()` 调用建立 `vnid` 和数据指针之间的关联。`get_vnode()` 调用返回与 `vnid` 关联的指针。`put_vnode()` 调用释放与 `vnid` 关联的资源。每个对 `get_vnode()` 的调用都应该有一个匹配的 `put_vnode()` 调用。Vnode 层管理活动和缓存的 vnode 池，并跟踪每个 `vnid` 的引用计数，以便 vnode 仅从磁盘加载一次，直到它从内存中被刷新。加载和卸载 `vnid` 的序列化很重要，因为它简化了文件系统的构建。

`remove_vnode()`、`unremove_vnode()` 和 `is_vnode_removed()` 函数为文件系统提供了一种机制，使其可以请求 vnode 层设置、取消设置或查询 vnode 的移除状态。文件系统将 vnode 标记为待删除，以便在没有更多对文件的活动引用时，vnode 层可以删除该文件。

除了前面那些操作 `vnid` 的 vnode 层例程之外，vnode 层还有一个在操作符号链接时使用的支持例程：

```c
int new_path(const char *path, char **copy);
```

该例程操作字符串，并实现了 vnode 层和文件系统之间清晰的所有权划分。我们将在本章稍后详细讨论该例程。

所有 vnode 层支持例程对于文件系统的正确操作都是必需的。正如我们将看到的，这些例程在文件系统和 vnode 层之间提供的接口虽然简单但已足够。

## 10.4 实际工作原理 (How It Really Works)

BeOS vnode 层以抽象的方式管理文件系统。文件系统实现导出一个包含 57 个函数的结构，vnode 层可以在需要时调用这些函数。文件系统是被动的，因为它仅由 vnode 层调用；它从不主动发起操作。文件系统导出的这组函数封装了 BeOS 提供的所有功能，包括属性、索引和查询功能。幸运的是，并非所有文件系统都必须实现每个调用，因为大多数功能并非严格需要。一个仅实现大约 20 个函数的文件系统就可以在基本级别上运行。

最基本的文件系统可能只能迭代目录并提供有关文件的完整信息（即 `stat` 结构）。除此之外，API 中的所有其他函数都是可选的。像根文件系统（它是一个纯内存文件系统）这样的文件系统只能创建目录和符号链接，并且它只实现这些抽象所必需的调用。

vnode 操作由列表 10-1 中的 vnode_ops 结构给出。在 57 个 vnode 操作中，BFS 实现了除以下四个之外的所有操作：

- rename_index 
- rename_attr s
- ecure_vnode 
- link

缺少这两个重命名函数并没有带来任何问题（它们在 API 中的存在主要是为了完整性，回想起来它们本可以被删除）。`secure_vnode` 函数与保护对 `vnid` 的访问有关，当安全性成为 BeOS 更重要的问题时，将有必要实现该函数。`link` 函数用于创建硬链接，但由于 BeOS C++ API 不支持硬链接，我们选择不实现此函数。

我们将描述 BeOS vnode 层如何使用这些函数，以及文件系统必须如何做才能正确实现 API，而不是简单地描述每个函数的作用（这对你我来说都会变得非常枯燥）。

### 初始阶段 (In the Beginning)

我们将讨论的第一组 vnode 层调用是那些处理文件系统的挂载 (mounting)、卸载 (unmounting) 和获取文件系统信息的调用。这些操作在整个文件系统的级别上进行，不操作单个文件（与大多数其他操作不同）。

vnode 接口的 `mount` 调用是启动对文件系统访问的调用。`mount` 调用始于从用户空间发起的系统调用。

```c
typedef struct vnode_ops {
    op_read_vnode (*read_vnode);
    op_write_vnode (*write_vnode);
    op_remove_vnode (*remove_vnode);
    op_secure_vnode (*secure_vnode);
    op_walk (*walk);
    op_access (*access);
    
    op_create (*create);
    op_mkdir (*mkdir);
    op_symlink (*syslink);
    op_link (*rename);
    op_remame (*remame);
    op_unlink (*unlink);
    op_rmdir (*rmdir);
    op_readlink (*readlink);
    
    op_opendir (*opendir);
    op_closedir (*closedir);
    op_free_cookie (*free_djrcookie);
    op_rewindir (*rewindir);
    op_readdir (*readdir);
    
    op_open (*open);
    op_close (*close);
    op_free_cookie (*free_cookie);
    op_read (*read);
    op_write (*write);
    op_locit (*locit);
    op_setflags (*setflags);
    op_rstat (*rstat);
    op_wstat (*wstat);
    op_fsync (*fsync);
    
    op_initialize (*initialize);
    op_nount (*nount);
    op_unmount (*unmount);
    op_sync (*sync);
    
    op_rfsstat (*rfsstat);
    op_wfsstat (*wfsstat);
    
    op_open_indexdir (*open_indexdir);
    op_close_indexdir (*close_indexdir);
    op_free_cookie (*free_indexdjrcookie);
    op_rewind_indexdir (*rewind_indexdir);
    op_read_indexdir (*read_indexdir);
    
    op_create_index (*create_index);
    op_remove_index (*remove_index);
    op_remame_index (*remame_index);
    op_stat_index (*stat_index);
    
    op_open_attrdir (*open_attrdir);
    op_close_attrdir (*close_attrdir);
    op_free_cookie (*free_attrdircookie);
    op_rewind_attrdir (*rewind_attrdir);
    op_read_attrdir (*read_attrdir);
    op_write_attr (*write_attr);
    op_read_attr (*read_attr);
    op_remove_attr (*remove_attr);
    op_remame_attr (*remame_attr);
    op_stat_attr (*stat_attr);
    
    op_open_query (*open_query);
    op_close_query (*close_query);
    op_free_cookie (*free_querycookie);
    op_read_query (*read_query);
} vnode_ops;
```

*(代码清单10-1 展示了文件系统实现的 BeOS vnode 操作结构 `vnode_ops`。)*

`mount()` 系统调用允许用户在文件名称空间中的特定位置，将特定类型的文件系统挂载到设备上。`mount` 调用传入的参数指定了文件系统应使用的设备（如果有的话），以及一个指向任意数据（来自用户空间）的指针，文件系统可以使用该数据来指定额外的文件系统特定参数。

当 vnode 层调用特定文件系统的 `mount` 操作时，由该文件系统负责 `open()` 设备、验证请求的卷，并准备它可能需要的任何数据结构。对于 BFS，挂载卷需要验证超级块、如果需要则回放日志，并读入卷的位图。像根文件系统这样的虚拟文件系统可能只需要分配和初始化一些数据结构。如果文件系统发现卷不是其格式，或者卷可能已损坏，它可以向 vnode 层返回一个错误代码，这将中止请求。

假设所有初始化检查都通过，文件系统就可以完成挂载过程。完成挂载过程的第一步是文件系统告诉 vnode 层如何访问文件系统的根目录。这一步是必要的，因为它提供了与存储在卷上的文件层次结构的连接。BFS 将根目录 i-node 号存储在超级块中，使其易于加载。加载根目录节点后，文件系统通过 `new_vnode()` 调用向 vnode 层发布根目录 i-node 号（其 `vnid`）。`new_vnode()` 例程是文件系统用来发布可供系统其余部分使用的新 `vnode-id` 的机制。我们将在讨论创建文件时更详细地讨论 `new_vnode()` 调用。根目录的 `vnid` 也存储到传递给 `mount` 调用的内存位置中。

每个文件系统还必须维护一些全局状态。文件系统的全局状态包括诸如底层卷的文件描述符、全局访问信号量和超级块数据等项。文件系统的 `mount` 例程初始化文件系统所需的任何结构。Vnode 层传递一个指针，文件系统可以用指向其文件系统全局状态结构的指针来填充该指针。Vnode 层每次调用文件系统时都会传递此指针。

文件系统的 `unmount` 操作非常简单。它保证只有在文件系统上没有打开的文件时才会被调用，并且只会被调用一次。`unmount` 操作应拆除与文件系统关联的任何结构，并释放先前分配的任何资源。BFS 的 `unmount` 操作会同步并关闭日志、释放分配的内存、刷新缓存，然后关闭底层设备的文件描述符。在 vnode 层中，卸载更为复杂，因为它必须确保在操作开始之前文件系统没有被访问。一旦卸载开始，就不应允许其他人接触该文件系统。

这组顶级 vnode 操作中的接下来两个操作是检索和设置文件系统全局信息的操作。`rfsstat` 函数读取文件系统信息结构。该结构包含诸如卷名、文件系统块大小、总块数、可用块数等项。诸如 `df` 之类的程序使用此信息，或者桌面上的磁盘图标的“获取信息”菜单项会显示此信息。

`wfsstat` 函数允许程序设置有关文件系统的信息。唯一支持可写入的字段是卷名。支持更改文件系统的块大小将非常困难，因此没有尝试这样做。

`rfsstat` 和 `wfsstat` 例程实现起来很简单，但是向系统的其余部分提供有关文件系统的全局信息以及允许编辑卷名是必需的。

### Vnode 支持操作 (Vnode Support Operations)

除了挂载/卸载文件系统问题之外，所有文件系统都必须实现某些与 vnode 相关的低级操作。这些函数为 vnode 层提供最基本的服务，所有其他 vnode 操作都依赖于这些例程的正确运行。这些操作是：

`op_walk (*walk);
op_read_vnode (*read_vnode);`
`op_write_vnode (*write_vnode);`

大多数 vnode 操作（如读或写）都有同名或名称非常相似的用户级函数。这些函数实现了同名用户级调用底层的功能。`walk`、`read_vnode` 和 `write_vnode` 函数与其他 vnode 操作不同。它们没有对应的用户级调用，并且它们的调用受到某些限制。

第一个例程 `walk()` 是整个 vnode 层 API 的核心。Vnode 层使用 `walk()` 函数来解析用户传入的文件名。也就是说，vnode 层“遍历”文件名，处理路径的每个组成部分（由“/”字符分隔），并向文件系统请求与完整路径的该组成部分相对应的 `vnid`。这里需要简要说明一下路径名解析。如果您习惯于传统的 Unix 路径名，那么选择“/”作为路径名中的分隔符是理所当然的。对于习惯于 MS-DOS（使用“\”）或 Macintosh（内部使用“:”）的人来说，这很不寻常。选择“/”令我们满意，但分隔符当然可以设为可配置的。我们认为，因此必须添加到所有 API（内核级和用户级）的复杂性并不值得拥有该功能。其他系统可能在这方面对灵活性有更高的要求。

回到当前的问题，`walk()` 例程的两个最重要的参数是目录节点和名称。名称是单个文件名组成部分（即，它不包含“/”字符）。文件系统应使用适当的任何机制在目录中查找该名称，并找到该名称的 `vnid`。如果该名称存在于目录中，`walk()` 应加载属于该名称的 `vnid`，并将该 `vnid` 通知 vnode 层。Vnode 层不关心名称的查找是如何发生的。每个文件系统都会以不同的方式执行此操作。Vnode 层只关心文件系统为该名称返回一个 `vnid`，并且它加载与该名称关联的 vnode。

为了从磁盘加载特定的 `vnid`，文件系统的 `walk()` 例程调用 vnode 层的支持例程 `get_vnode()`。`get_vnode()` 调用管理系统中活动和缓存的 vnode 池。如果一个 `vnid` 已经加载，`get_vnode()` 调用会增加引用计数并返回指向关联的文件系统特定数据的指针。如果 `vnid` 未加载，则 `get_vnode()` 调用文件系统的 `read_vnode()` 操作来加载该 `vnid`。请注意，当文件系统调用 `get_vnode()` 时，`get_vnode()` 调用可能会通过调用 `read_vnode()` 例程再次进入文件系统。如果文件系统对资源有任何全局锁，则这种对文件系统的重入需要特别注意。

一个简单的例子有助于说明 walk() 的过程。最简单的可能路径名是单个组件，例如 foo。这样的路径名没有子目录，并且引用文件系统中的单个实体。对于我们的示例，让我们考虑一个当前目录为根目录并且进行以下调用的程序：

`open("foo", O_RDONLY)`

要执行 `open()`，vnode 层必须将名称 `foo` 转换为文件描述符。文件名 `foo` 是一个简单的路径名，必须位于当前目录中。在此示例中，程序的当前目录是文件系统的根目录。文件系统的根目录是从 `mount()` 操作中得知的。使用此根目录句柄，vnode 层请求 `walk()` 例程将名称 `foo` 转换为 vnode。Vnode 层使用指向根目录的文件系统特定数据的指针和名称 `foo` 来调用文件系统的 `walk()` 例程。如果名称 `foo` 存在，文件系统将填写文件的 `vnid` 并调用 `get_vnode()` 从磁盘加载该 `vnid`。如果名称 `foo` 不存在，`walk()` 例程返回 `ENOENT` 并且 `open()` 失败。

如果 `walk()` 成功，vnode 层就拥有了与名称 `foo` 对应的 vnode。一旦 vnode 层的 `open()` 拥有了 `foo` 的 vnode，它将调用文件系统的 `open()` 函数。如果文件系统的 `open()` 因其权限检查等而成功，则 vnode 层随后创建其余必要的结构，以将调用线程中的文件描述符与文件 `foo` 的 vnode 连接起来。解析路径名并遍历各个组件的这个过程是为传递给 vnode 层的每个文件名执行的。尽管我们的示例只有一个路径名组件，但更复杂的路径执行相同的处理，但会迭代所有组件。`walk()` 操作执行了将目录中的命名条目转换为 vnode 层可以使用的 vnode 的关键步骤。

符号链接是目录中的命名条目，它们不是常规文件，而是包含另一个文件的名称。在用户级别，符号链接的正常行为是透明地使用符号链接指向的文件。也就是说，当程序打开一个作为符号链接的名称时，它打开的是符号链接指向的文件，而不是符号链接本身。在用户级别也有一些函数允许程序直接操作符号链接而不是它引用的文件。这种双重操作模式要求 vnode 层和文件系统的 `walk()` 函数具有支持遍历或不遍历链接的机制。

为了处理这两种行为，`walk()` 例程除了目录句柄和名称之外，还接受一个额外的参数。`walk()` 例程的 `path` 参数是指向字符指针的指针。如果此指针非空，则要求文件系统用指向符号链接中包含的路径的指针来填充该指针。填充 `path` 参数允许 vnode 层开始处理符号链接中包含的文件名参数。如果传递给文件系统 `walk()` 例程的 `path` 参数为空，则 `walk()` 的行为与正常情况一样，仅加载符号链接的 `vnid` 并为 vnode 层填充该 `vnid`。

如果名称存在于目录中，walk() 例程总是加载关联的 vnode。一旦加载了 vnode，文件系统就可以确定该节点是否是符号链接。如果是并且 path 参数非空，则文件系统必须填充 path 参数。为了填充 path 参数，walk() 例程使用 vnode 层的 new_path() 函数。new_path() 例程具有以下原型：

`int new_path(const char *npath, char **copy);`

第一个参数是符号链接中包含的字符串（即符号链接指向的文件的名称）。第二个参数是指向指针的指针，vnode 层用 `npath` 参数指向的字符串的副本填充该指针。如果 `new_path()` 函数成功，结果可以存储在 `walk()` 的 `path` 参数中。要求调用 `new_path()` 来有效地复制字符串可能看起来很奇怪，但这确保了字符串的正确所有权。否则，文件系统将分配字符串，而 vnode 层稍后会释放这些字符串，从设计的角度来看，这是“不干净的”。对 `new_path()` 的调用确保了 vnode 层是字符串的所有者。

一旦调用了这个 `new_path()` 函数，`walk()` 例程就可以释放它加载的符号链接的 vnode。要释放 vnode，`walk()` 函数调用 `put_vnode()`，它与 `get_vnode()` 相反。然后，vnode 层继续使用由 `walk()` 填充的新路径进行解析。尽管 `walk()` 例程可能看起来很复杂，但它并非如此。语义很难解释，但实际实现可以非常简短（BFS 的 `walk()` 例程只有 50 行代码）。`walk()` 的关键点在于它将目录中的名称映射到该名称底层的 vnode。`walk()` 函数还必须处理符号链接，要么遍历链接并返回符号链接中包含的路径，要么仅返回符号链接本身的 vnode。

文件系统的 `read_vnode()` 操作的工作很简单。它被赋予一个 `vnid`，并且它必须将该 `vnid` 加载到内存中，并构建文件系统访问与该 `vnid` 关联的文件或目录所需的任何必要结构。`read_vnode()` 函数保证对于任何 `vnid` 都是单线程的。也就是说，不必进行锁定，并且尽管对多个 `vnid` 的 `read_vnode()` 调用可能并行发生，但对于任何给定的 `vnid`，`read_vnode()` 永远不会多次发生，除非该 `vnid` 从内存中被刷新。

如果 `read_vnode()` 函数成功，它会填充一个指向其分配的数据结构的指针。如果 `read_vnode()` 失败，它会返回一个错误代码。对 `read_vnode()` 没有其他要求。

`write_vnode()` 操作的命名有些不当。在调用 `write_vnode()` 时，没有数据写入磁盘。相反，`write_vnode()` 是在 vnode 的引用计数降至零并且 vnode 层决定从内存中刷新该 vnode 之后调用的。`write_vnode()` 调用也保证只被调用一次。`write_vnode()` 调用不需要锁定所讨论的节点，因为 vnode 层将确保没有其他对该 vnode 的访问。`write_vnode()` 调用应释放与该节点关联的任何资源，包括任何额外分配的内存、节点的锁等等。尽管它的名字如此，`write_vnode()` 并不将数据写入磁盘。

对于任何给定的 `vnid`，`read_vnode()` 和 `write_vnode()` 调用总是成对发生。`read_vnode()` 调用一次以加载 `vnid` 并分配任何必要的结构。`write_vnode()` 调用一次，并应释放与该节点关联的所有内存中资源。这两个调用都不应修改任何磁盘上的数据结构。

### 保护 Vnode (Securing Vnodes)

这组函数中还有另外两个例程：

`op_secure_vnode (*secure_vnode);`

`op_access (*access);`

`access()` 例程是 POSIX `access()` 调用的 vnode 层等价物。BFS 遵守此调用并执行所需的权限检查。`secure_vnode()` 函数的目的是保证程序请求的 `vnid` 确实是一个有效的 vnode，并且允许对其进行访问。此调用目前在 BFS 中未实现。`secure_vnode()` 和 `access()` 之间的区别在于，`secure_vnode()` 在需要时由 vnode 层直接调用，以确保请求特定 `vnid` 的程序确实有权访问它。`access()` 调用仅在响应用户程序进行 `access()` 系统调用时才会进行。

### 目录函数 (Directory Functions)

挂载文件系统后，最可能进行的操作是调用以迭代根目录的内容。目录 vnode 操作抽象了迭代目录内容的过程，并为系统的其余部分提供了统一的接口，而不管文件系统中的实现如何。例如，BFS 使用磁盘上的 B+树来存储目录，而根文件系统则将目录存储为内存中的链表。Vnode 目录操作使实现上的差异变得透明。

用于操作目录的 vnode 层操作是：

`op_opendir (*opendir);`

`op_closedir (*closedir);`

`op_free_cookie (*free_dircookie);`

`op_rewinddir (*rewinddir);`

`op_readdir (*readdir);`

除了 `free_dircookie` 函数外，这些函数与同名的 POSIX 目录函数非常对应。

`opendir` 函数接受一个指向节点的指针，并基于该节点创建一个状态结构，该结构将用于帮助迭代目录。当然，状态结构对 vnode 层是不透明的。此状态结构也称为 cookie。Vnode 层将 cookie 存储在 `ofile` 结构中，并在每次调用目录例程时将其传递给它们。文件系统负责 cookie 的内容。

回想一下，cookie 包含有关文件描述符的文件系统特定数据。Cookie 的这种用法在 vnode 层接口中非常常见，并且会多次出现。

Vnode 层仅在文件描述符的打开计数为零并且没有线程使用该文件描述符时才调用 `free_dircookie` 函数。关闭操作和释放 cookie 操作之间有一个重要的区别。这种区别的产生是因为多个线程可以访问一个文件描述符。尽管一个线程调用 `close()`，但另一个线程可能正在进行 `read()` 操作。只有在最后一个线程完成对文件描述符的访问之后，vnode 层才能调用文件系统的 `free_cookie` 例程。BFS 在其 `closedir()` 例程中几乎不做任何工作。然而，`free_dircookie` 例程必须释放与传递给它的 cookie 相关的任何资源。Vnode 层管理与 cookie 相关的计数，并确保仅在最后一次关闭之后才调用 `free_cookie` 例程。

使用 cookie 时的另一个注意事项涉及多线程问题。Vnode 层在调用文件系统时不对任何数据结构执行序列化或锁定。除非另有说明，否则所有文件系统例程都需要执行适当的锁定以确保正确的序列化。某些文件系统可能会使用单个锁来序列化整个文件系统。BFS 在节点级别进行访问序列化，这是可能的最小粒度。BFS 必须在访问传入的 cookie 之前首先锁定节点（或者它应该仅以只读方式访问 cookie）。在访问 cookie 之前锁定节点是必要的，因为可能有多个线程同时使用相同的文件描述符，因此它们将使用相同的 cookie。首先锁定节点可确保一次只有一个线程访问 cookie。

回到我们对目录 vnode 操作的讨论，扫描目录的主要函数是 `readdir` 函数。该例程使用 cookie 中传递的信息来迭代目录，每次都返回有关目录中下一个文件的信息。返回的信息包括文件的名称和 i-node 号。存储在 cookie 中的状态信息应足以使文件系统能够在下一次调用 `readdir` 时继续迭代目录。当目录中没有更多条目时，`readdir` 函数应返回它读取了零个项目。

`rewinddir` 函数只是重置存储在 cookie 中的状态信息，以便下一次调用 `readdir` 将返回目录中的第一项。

这种迭代文件系统中项目列表的风格被复制了多次。属性和索引都使用几乎相同的接口。查询接口略有不同，但使用相同的基本原则。目录操作的关键概念是 `readdir` 操作，它返回目录中的下一个条目，并在 cookie 中存储状态，以便在下一次调用 `readdir` 时能够继续迭代目录。Cookie 的使用使得这种断开连接的操作方式成为可能。

