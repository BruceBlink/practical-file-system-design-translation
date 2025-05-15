---
typora-root-url: ./..\..\public
---

# 属性、索引和查询

本章讨论三个密切相关的主题：属性、索引和查询。这三项功能为文件系统增添了强大的能力，并赋予文件系统许多通常只有数据库才具备的特性。本章旨在说明为什么属性、索引和查询是现代文件系统的重要功能。我们将既讨论这些机制的高层次问题，也深入讲解 BFS（Be File System）的具体实现细节。

## 5.1 属性

什么是属性？一般来说，属性是一个名称（通常是一个简短的描述性字符串）和一个值，例如数字、字符串，甚至原始二进制数据。例如，一个属性可以有一个名为“年龄”的名称和一个值为 27 的值，或者一个名为“关键字”的名称和一个值为“计算机 文件系统 日志”的值。属性是关于实体的信息。在文件系统的上下文中，属性是关于文件的附加信息，这些信息没有存储在文件本身中。能够将关于文件的信息与文件一起存储但不在文件内部存储是非常重要的，因为通常修改文件的内容来存储这些信息是不可行的——甚至是不可能的。

程序可以在属性中存储许多类型的数据，例如：

- 窗口系统的图标位置和信息
- 已下载 Web 文档的源 URL
- 文件的类型
- 文件的上次备份日期
- 电子邮件的“收件人”、“发件人”和“主题”行
- 文档中的关键字
- 安全系统的访问控制列表
- 富文本编辑器的样式信息（字体、大小等）
- 图像的伽马校正、颜色深度和尺寸
- 关于文件的评论
- 联系人数据库信息（地址、电话/传真号码、电子邮件地址、URL）

这些是关于对象的信息示例，但它们不一定是我们会——甚至能够——存储在对象本身中的信息。这些示例仅仅开始触及我们可能存储在属性中的信息种类。将任意名称/值对附加到文件的能力开启了许多有趣的可能性。

### 属性的使用示例

考虑管理人员信息的需要。电子邮件程序需要一个人的电子邮件地址，联系人管理器需要一个电话号码，传真程序需要一个传真号码，而文字处理器的邮件合并功能需要一个实际地址。这些程序中的每一个都有特定的需求，通常每个程序都会拥有其所需的关于人的信息的私有副本，尽管许多信息最终会在每个应用程序中重复。如果关于某个人的某条信息应该更改，则需要更新几个不同的程序——这不是理想的情况。

相反，使用属性，文件系统可以将人表示为一个文件。文件的名称将是人的姓名，或者可能是更唯一的标识符。这个“人文件”的属性可以维护关于人的信息：电子邮件地址、电话号码、传真号码、URL 等等。然后，上面提到的每个程序都简单地访问它需要的属性。所有程序都从同一个地方获取信息。此外，需要存储不同信息的程序可以添加和修改其他属性，而不会干扰现有程序。

在这个例子中，属性的强大之处在于许多程序可以轻松地共享信息。因为对属性的访问是统一的，所以应用程序只需要就属性的名称达成一致。这有助于程序协同工作，消除了浪费的数据重复，并使程序不必都实现自己的小型数据库。另一个好处是，需要先前未知属性的新应用程序可以添加新属性，而不会中断使用旧属性的其他程序。在这个例子中，将信息存储为属性也带来了其他好处。从用户的角度来看，存在一个关于人员信息的单一界面。他们可以期望，如果在电子邮件程序中选择一个人，电子邮件程序将使用该人的电子邮件属性并允许用户向他们发送电子邮件。同样，如果用户将“人文件”的图标拖放到传真程序上，很自然地会期望传真程序知道您想向该人发送传真。在这个例子中，属性提供了一种简单的方法来集中存储关于人员的信息，并以一种有助于应用程序之间共享的方式进行存储。

其他不太复杂的例子比比皆是。Web 浏览器可以存储已下载文件的源 URL，以便用户稍后可以询问“返回到此文件来自的站点”。图像扫描程序可以将关于扫描的颜色校正信息作为文件的属性存储。使用字体和样式的文本编辑器可以将关于文本的样式信息作为属性存储，而将原始文本保留为纯 ASCII（这将允许使用多种字体、样式、颜色等编辑源代码）。文本编辑器可以合成文档中包含的主要关键字，并将这些关键字存储为文档的属性，以便以后可以搜索包含某种类型内容的文件。

这些例子都说明了如何使用属性。属性为程序提供了一种存储关于文件的数据的机制，这种方式使得以后很容易检索信息并与其他应用程序共享信息。

### 属性 API

可以对属性执行许多操作，但 BeOS 中的文件系统接口保持列表简短。程序可以对文件属性执行以下操作：

- 写入属性
- 读取属性
- 打开属性目录
- 读取属性目录
- 重置属性目录
- 关闭属性目录
- 获取属性状态
- 删除属性
- 重命名属性

毫不奇怪，这些操作与文件的相应操作非常相似，并且它们的行为几乎相同。要访问文件的属性，程序必须首先打开该文件，并使用该文件描述符作为访问属性的句柄。文件的属性没有单独的文件描述符。文件的属性目录类似于常规目录。程序可以打开它并遍历它以枚举文件的所有属性。

值得注意的是，列表中缺少像我们对常规文件那样打开和关闭属性的操作。因为属性不使用单独的文件描述符进行访问，所以打开和关闭操作是多余的。用户级 API 调用以从属性读取和写入数据具有以下原型：

```c
ssize_t fs_read_attr(int fd, const char *attribute, uint32 type, off_t pos, void *buf, size_t count);
ssize_t fs_write_attr(int fd, const char *attribute, uint32 type, off_t pos, const void *buf, size_t count);
```

每个调用都封装了执行 I/O 所需的所有状态。文件描述符指示要操作哪个文件，属性名称指示要对哪个属性执行 I/O，类型指示正在写入的数据类型，而位置指定在属性中的偏移量以执行 I/O。属性读/写操作的语义与文件读/写操作的语义相同。写操作还有一个额外的语义：如果属性名称不存在，它将隐式创建它。写入现有属性将覆盖该属性（除非位置非零，在这种情况下，如果该属性已经存在，它将扩展该属性）。

列出文件属性的函数与列出目录内容的标准 POSIX 函数非常相似。打开属性目录操作启动对属于文件的属性列表的访问。打开属性目录操作返回一个文件描述符，因为与读取目录相关的状态无法在用户空间中维护。读取属性目录操作返回下一个连续条目，直到没有更多条目为止。重置操作将目录流中的位置重置到目录的开头。当然，关闭操作只是关闭文件描述符并释放相关的状态。

其余的操作（stat、remove 和 rename）是典型的内务管理操作，没有细微之处。stat 操作给定一个文件描述符和属性名称，返回关于属性大小和类型的信息。remove 操作从与文件关联的属性列表中删除指定的属性。rename 操作目前在 BFS 中尚未实现。

### 属性细节

如前所述，属性是一个字符串名称和一些任意的数据块。在 BeOS 中，属性还声明了与名称一起存储的数据类型。数据类型可以是整数类型（字符串、整数或浮点数），也可以是任意大小的原始数据。类型字段仅在严格意义上是支持索引所必需的。

在决定使用什么数据结构来存储属性时，我们的第一个想法可能是定义一个新的数据结构。但是，如果我们抵制住这种诱惑，并仔细查看属性必须存储的内容，我们会发现其描述与文件的描述惊人地相似。在最基本的层面上，属性是一个命名的实体，它必须存储任意数量的数据。虽然大多数属性很可能都很小，但在属性中存储大量数据非常有用并且需要完全支持。考虑到这一点，重用文件底层的数据结构（即 i 节点）是很有意义的。i 节点表示磁盘上的数据流，因此可以存储任意数量的信息。通过将属性的内容存储在 i 节点的数据流中，文件系统不必管理一组专门用于属性的单独数据结构。

与文件关联的属性列表也需要一个数据结构和存储位置。借鉴我们观察到的属性与文件的相似性，很自然地将属性列表存储为目录。目录正是完成此任务所需的属性：它将名称映射到 i 节点。将所有结构绑定在一起所需的最后一部分是文件 i 节点到属性目录 i 节点的引用。图 5-1 图示了这些结构之间的关系。然后可以从文件 i 节点遍历到列出所有属性的目录。从目录条目中可以找到每个属性的 i 节点，并且访问属性 i 节点使我们能够访问属性的内容。

![figure5-1](/images/chapter5/figure5-1.png)

这种实现是最容易理解和实现的。这种方法的唯一缺点是，虽然理论上很优雅，但实际上其性能将非常糟糕。性能会受到影响，因为每个属性都需要多次磁盘操作才能找到和加载。BFS 的初始设计使用了这种方法。当它第一次呈现给其他工程师时，由于访问属性所需的间接级别，它很快就被否决了（并且这样做是正确的）。

这种性能瓶颈是一个问题，因为在 BeOS 中，窗口系统将文件的图标位置存储为文件的属性。因此，使用这种设计，当显示目录中的所有文件时，每个文件至少需要一次磁盘访问来获取文件 i 节点，一次访问来加载属性目录 i 节点，另一次目录访问来查找属性名称，另一次访问来加载属性 i 节点，最后还需要一次磁盘访问来加载属性的数据。鉴于当前的磁盘驱动器的访问时间约为毫秒级（有时是数十毫秒），而 CPU 速度达到亚 5 纳秒级，很明显，强迫 CPU 等待五次磁盘访问来显示单个文件将严重影响性能。

我们知道文件的许多属性都很小，并且提供对它们的快速访问将使许多程序受益。本质上，问题在于文件的至少一些属性需要更有效的访问。解决方案与大约在同一时间出现的另一个设计问题结合在一起。BFS 需要能够在卷上存储任意数量的文件，并且预先在卷上为 i 节点保留空间被认为不可接受。在文件系统初始化时保留 i 节点的空间是管理 i 节点的传统方法，但这会导致在文件很少的大型驱动器上浪费大量空间，并且总是会成为文件很多但 i 节点不足的文件系统的限制。BFS 只需要消耗磁盘上存储的文件所需的空间——不多也不少。这意味着 i 节点很可能存储为单独的磁盘块。最初看来，将每个 i 节点存储在其自己的磁盘块中会浪费太多空间，因为 i 节点结构的大小只有 232 字节。然而，当这种存储 i 节点的方法与需要存储几个小属性以进行快速访问的需求相结合时，解决方案就很清楚了。i 节点块的剩余空间适合存储文件的小属性。BFS 将 i 节点块末尾的这个空间称为小数据区。从概念上讲，BFS i 节点如图 5-2 所示。

![figure5-2](/images/chapter5/figure5-2.png)

因为并非所有属性都能放入 i 节点的小数据区，所以 BFS 继续使用属性目录和 i 节点来存储额外的属性。访问非常驻属性的成本确实高于小数据区中的属性，但这种权衡是值得的。最常见的情况非常高效，因为一次磁盘读取将检索 i 节点和许多通常最需要的小属性。

小数据区纯粹是 BFS 的实现细节，对程序员完全透明。事实上，不可能请求将属性放入小数据区。暴露这种性能优化的细节会破坏原本清晰的属性 API。

好的，以下是原文的中文翻译：

#### 小数据区域详情

BFS 用于管理小数据区域空间的结构体定义为：

```c
typedef struct small_data {
    uint32 type;
    uint16 name_size;
    uint16 data_size;
    char name[1];
} small_data;
```

这个数据结构经过优化，以使其尽可能小，从而可以在 i-node 中封装尽可能多的实例。name_size 和 data_size 这两个大小字段被限制为 16 位整数，因为我们知道 i-node 的大小永远不会超过 8K。type 字段也应该是 16 位，但我们必须保留从更高层软件传递进来的确切类型。

name 字段的内容大小可变，并开始于 small_data 结构体的最后一个字段（结构体中的成员 name 仅仅是一个便于引用构成名称的字节起始位置的方式，而不是一个只有单字符的固定大小名称）。属性的数据部分存储在 name 后面的字节中，没有填充。一个产生指向 small_data 结构体数据部分的指针的 C 宏定义如下：

```c
#define SD_DATA(sd) \
    (void *)((char *)sd + sizeof(*sd) + (sd->name_size-sizeof(sd->name)))
```

以典型的令人费解的 C 编程风格，这个宏使用了指针算术来生成一个指向可变大小 name 字段后面字节的指针。

图 5-3 展示了小数据区域的使用方式。

![figure5-3](/images/chapter5/figure5-3.png)

所有操作 small_data 结构体的例程都期望一个指向 i-node 的指针，在 BFS 中，这个指针不仅仅是指 i-node 结构体本身，而是 i-node 所在的整个磁盘块。存在以下例程来操作 i-node 的小数据区域：

- 查找具有给定名称的 small_data 结构体
- 创建具有名称、类型和数据的新 small_data 结构体
- 更新现有的 small_data 结构体
- 获取 small_data 结构体的数据部分
- 删除 small_data 结构体

从 i-node 地址开始，第一个 small_data 结构体的地址可以通过将 i-node 结构体的大小添加到其地址轻松计算出来。得到的指针是小数据区域的基址。有了第一个 small_data 结构体的地址，操作小数据区域的例程都期望并维护一个紧密 packed 的 small_data 结构体数组。空闲空间始终是数组中的最后一个项，并被管理为一个 type 为零、名称长度为零、数据大小等于剩余空闲空间大小（不包括结构体本身的大小）的 small_data 项。

由于 BFS 尽可能紧密地 packed small_data 结构体，任何给定的 small_data 结构体实例都不太可能在“好”的内存边界上对齐（即，“好”边界是四或八的倍数的地址）。这可能在某些 RISC 处理器上导致对齐异常。如果将 BeOS 移植到像 MIPS 这样的架构上，BFS 必须先将 small_data 结构体复制到 Properly aligned 的临时变量中，然后从那里进行解引用，这将使代码变得复杂得多。由于 BeOS 当前运行的 CPU（PowerPC 和 Intel x86）没有这个限制，当前的 BFS 代码忽略了这个问题，尽管它是非可移植的。

i-node 的小数据区域非常适合存储一系列紧密 packed 的属性。然而，实现并不完美，BFS 还可以使用其他技术进一步减小小数据结构体的大小。例如，可以使用 C 的 union 类型来消除固定大小属性（如整数或浮点数）的大小字段。或者属性名称可以存储为哈希值，而不是显式字符串，然后在哈希表中查找字符串。尽管这些技术可以节省一些空间，但它们会使代码更加复杂，并且更难以调试。尽管看起来很简单，但 small_data 属性的处理经过了多次迭代才最终正确。

### 大局：小数据属性及更多

前面的描述详细介绍了使用 small_data 结构体的机制，但没有提供太多关于它如何与 BFS 的通用属性机制联系起来的见解。正如我们之前讨论的，一个文件可以有任意数量的属性，每个属性都是任意大小的名称/值对。文件系统内部必须管理 reside 在小数据区域以及位于属性目录中的属性。

概念上管理这两组属性是直观的。每次程序请求属性操作时，文件系统会检查属性是否在小数据区域中。如果不在，它 then 会在属性目录中查找该属性。然而，在实践中，这增加了代码的复杂性。例如，写属性操作使用了列表 5-1 中所示的算法。

```c
if length of data being written is small
 find the attribute name in the small_data area 
    if found
  delete it from small_data and from any indices
 else
  create the attribute name
 write new data
 if it fits in the small_data area
  delete it from the attribute directory if present
 else
  create the attribute in the attribute directory 
        write the data to the attribute i-node 
        delete name from the small_data area if it exists
else
 create the attribute in the attribute directory 
    write the data to the attribute i-node 
    delete name from the small_data area if it exists

```

诸如在将属性添加到小数据区域后将其从属性目录中删除之类的微妙之处，在重写现有属性导致属性位置发生变化的情况下是必需的。

操作 reside 在文件属性目录中的属性变得更容易，因为许多操作可以重用适用于文件的现有操作。在属性目录中创建属性使用与在目录中创建文件相同的底层函数。同样，读、写和删除属性的操作使用与文件相同的例程。这些操作所需的 glue code 具有类似于对小数据区域操作的微妙之处（如果在将属性写入属性目录时存在于小数据区域中，则需要从 small_data 区域中删除属性，等等）。

文件系统可重入性是另一个增加复杂性的问题。由于文件系统使用相同的操作访问属性目录和属性，我们必须小心，确保相同的资源永远不会被第二次锁定（这将导致死锁）。幸运的是，像这样的死锁问题如果遇到会非常 catastrophic，从而易于检测（文件系统会锁定）并纠正（很容易检查有问题代码的状态，并从那里回溯到解决方案）。

### 属性总结

属性的基本概念是一个名称以及与该名称关联的一些数据块。属性可以是简单的事情：

```c
Keywords = bass, guitar, drums
```

或者它可以是更复杂的关联数据。与属性关联的数据是自由形式的，可以存储任何内容。在文件系统中，属性通常附加到文件上，并存储关于文件内容的信息。

实现属性并不困难，尽管直接的实现将在性能方面受到影响。为了加速属性访问，BFS 直接在文件的 i-node 中支持一个快速属性区域。快速属性区域显著降低了访问属性的成本。

## 5.2 索引

为了理解索引，设想以下场景会很有帮助：假设你去图书馆想找一本书。在图书馆里，你没有找到一丝不苟组织好的卡片目录，而是发现了一大堆卡片，每张卡片都完整地包含了一本特定图书的信息（属性）。如果这堆卡片没有任何顺序，要找到你想要的书将是一件非常 tedious 的事情。由于图书管理员 preferring order to chaos，他们维护着关于图书的三份索引。每个目录都按字母顺序排列，一个按书名，一个按作者姓名，一个按主题领域。这使得通过搜索作者、书名或主题索引卡片来定位特定图书变得相当简单。

文件系统中的索引与图书馆的卡片目录非常相似。文件系统中的每个文件都可以视为图书馆中的一本书。如果文件系统不索引关于文件的信息，那么查找特定文件可能需要遍历所有文件才能找到匹配的文件。当文件很多时，这种 exhaustive search 会很慢。索引文件名称、大小和上次修改时间等项目可以显著减少查找文件所需的时间。在文件系统中，索引只是一个按某些标准排序的文件列表。

随着文件可能拥有的附加属性的存在，除了文件固有的属性之外，自然而然地允许索引其他属性。因此，文件系统可以索引一个人的电话号码属性，电子邮件地址的“发件人”字段，或文档的关键字。索引附加属性为用户在文件系统中定位信息的方式提供了相当大的灵活性。

如果文件系统索引关于文件的属性，用户可以提出复杂的查询，例如“查找过去一周收到 Bob Lewis 的所有电子邮件”。文件系统可以搜索其索引并生成匹配条件的 file list。虽然电子邮件程序确实可以做到这一点，但在文件系统中通过通用机制进行索引允许所有应用程序拥有内置的数据库功能，而无需它们 each implement their own database。

支持索引的文件系统突然具备了传统数据库的许多特性，两者之间的界限变得模糊。尽管支持属性和索引的文件系统与数据库非常相似，但两者并不相同，因为它们的目标 push them in subtly different directions。例如，数据库以牺牲一些灵活性（数据库通常是固定大小的条目，创建数据库后难以扩展记录等）为代价换取功能（更快的速度和处理更多条目的能力，更丰富的查询接口）。文件系统以开销为代价提供了更多的通用性：将数百万个 128 字节的记录作为文件存储在文件系统中会有相当大的开销。因此，尽管表面上带有索引的文件系统和数据库共享许多功能，但它们不同的设计目标使它们保持 distinct。

通过简化许多细节，上述例子 give a flavor of what is possible with indices。以下各节将讨论涉及的实质性问题。

### 什么是索引？

我们需要回答的第一个问题是，什么是索引？索引是一种允许 efficient lookups of input values 的机制。 using our card catalog example，如果在作者索引中查找“Donald Knuth”，我们将找到 Donald Knuth 所著图书的 references，这些 references 将允许我们定位图书的 physical copy。查找值“Knuth”是高效的，因为目录按字母顺序排列。我们可以直接跳到作者姓名以“K”开头的卡片部分，然后从那里跳到姓名以“Kn”开头的卡片部分，依此类推。

用计算机术语来说，索引是存储键/值对并允许 efficient lookups of keys 的数据结构。键可以是字符串、整数、浮点数或可以比较的其他数据项。与键一起存储的值通常只是对与键关联的其余数据的 reference。对于文件系统，与键关联的值是与键关联的文件的 i-node number。

索引的键必须始终具有 consistent order。也就是说，如果索引比较键 A 与键 B，它们必须始终具有相同的关系——要么 A 小于 B，要么大于 B，要么等于 B。除非 A 或 B 的值发生变化，否则它们的关系不能改变。对于字符串和整数等 integral computer types，这不是问题。比较更复杂的结构会使情况 less clear。

许多教科书阐述了管理 sorted lists of data 的不同方法。通常，每种保持 sorted list of data 的方法都有 some advantages and some disadvantages。对于文件系统，索引数据结构必须满足几个要求：

- 它必须是一个 on-disk structure。
- 它必须具有 reasonable memory footprint。
- 它必须具有 efficient lookups。
- 它必须支持 duplicate entries。

首先，文件系统使用的任何索引方法 inherently 必须是一个 on-disk data structure。大多数常见的索引方法只在内存中工作，这使得它们不适合文件系统。文件系统索引必须存在于永久存储上，以便在重新启动和崩溃后 survive。此外，由于文件系统仅仅是整个操作系统的 supporting piece 而不是 focal point，使用索引不能对系统的其余部分 impose undue requirements。因此，整个索引不能保存在内存中，也不能在文件系统每次访问索引时加载 significant chunk of it。一个文件系统上可能有许多索引，文件系统需要能够同时加载任意数量的索引，并能够在需要时在它们之间切换，而不会在每次访问新索引时产生昂贵的性能开销。这些约束消除了商业数据库领域 commonly used 的许多索引技术。

索引的主要要求是它可以 efficiently look up keys。查找操作的效率对文件系统的整体性能会产生 dramatic effect，因为每次访问文件名称都必须执行查找。因此，显然查找必须是索引上最高效的操作。

最后一个要求，也许也是最困难的要求，是需要在索引中支持 duplicate entries。乍一看，支持 duplicate entries 可能看起来 unnecessary，但事实并非如此。例如，如果文件系统索引文件名称，duplicate entries 是 indispensable 的。将会有 many duplicate names，因为如果文件 reside 在不同的目录中，它们可以有相同的名称。根据文件系统的使用情况，重复项的数量可能从每个索引只有少数到每个索引数万不等。如果这个问题处理得不好，性能可能会受到很大影响。

### 数据结构选择

尽管存在许多索引数据结构，但文件系统只能考虑少数几种。到目前为止，用于存储 on-disk index 的 most popular data structure 是 B 树或其任何变体（B*树、B+树等）。哈希表是另一种可以扩展到 on-disk data structures 的技术。每种数据结构都有 advantages and disadvantages。我们将 briefly discuss each of the data structures and their features。

#### B 树

B 树是一种树状数据结构，它将数据组织成一个节点集合。与真实的树一样，B 树从根节点开始，根节点是起始节点。从根节点的链接引用其他节点，这些节点又包含指向其他节点的链接，直到链接到达叶节点。叶节点是没有指向其他节点的链接的 B 树节点。

每个 B 树节点存储一定数量的键/值对（键/值对的数量取决于节点的大小）。在每个键/值对旁边是一个指向另一个节点的 link pointer。B 树节点中的键保持有序，与键/值对关联的链接指向其键都小于当前键的节点。

图 5-4 展示了一个 B 树的例子。在这里我们可以看到，与单词 cat 关联的链接指向仅包含词典顺序小于单词 cat 的值的节点。同样，与单词 indigo 关联的链接引用一个包含小于 indigo 但大于 deluxe 的值的节点。底部的节点行（able, ball 等）都是叶节点，因为它们没有链接。

B 树的一个重要属性是它们维护节点之间的 relative ordering。也就是说，由根节点中 man 的链接引用的所有节点都将包含大于 cat 且小于 man 的条目。B 树搜索例程利用此属性来减少查找特定节点所需的工作量。

知道 B 树节点已排序，并且每个条目的链接指向键小于当前键的节点，我们可以执行 B 树搜索。通常搜索每个节点使用 binary search，但我们将使用 sequential search 进行说明以简化讨论。如果我们要查找单词 deft，我们将从根节点开始，并在其键中搜索单词 deft。第一个键 cat 小于 deft，因此我们继续。单词 deft 小于 man，因此我们知道它不在此节点中。但是单词 man 有一个链接，因此我们 following the link 到下一个节点。在第二级节点（deluxe indigo）中，我们将 deft 与 deluxe 进行比较。同样，deft 小于 deluxe，因此我们 following the associated link。我们到达的最终节点包含单词 deft，我们的搜索是成功的。如果我们搜索单词 depend，我们将 following the link from deluxe，并发现我们的键大于 deft，因此我们将停止搜索，因为我们到达了叶节点，并且我们的键大于节点中的所有键。

关于搜索算法 important part to observe 是我们为了进行搜索需要查看的节点数量之少（10 个节点中 only 3 个）。当有成千上万个节点时，节省的开销是巨大的。当 B 树良好平衡时，如上面的例子所示，搜索 N 个键的树所需的时间与 logk(N) 成正比。对数的底 k 是每个节点中的键数量。当有很多键时，这是一个非常好的搜索时间，也是 B 树作为索引技术流行的 primary reason。

B 树性能的关键在于它们保持 reasonable balance。B 树的一个重要属性是树的任何一个分支都不会 significantly taller than any other branch。 maintaining this property 是插入和删除操作的要求，这使得它们的实现比搜索操作复杂得多。

B 树的插入首先 locates the desired insertion position (by doing a search operation)，然后尝试插入键。如果插入键会导致节点 overfull（每个节点都有固定的最大大小），那么节点将被 split into two nodes， each getting half of the keys。splitting a node requires modifications to the parent nodes of the node that is split。 split 节点的父节点需要改变其指向 child node 的指针，因为现在有两个子节点。这种改变可能会一直向上 propagating 到 root node，甚至可能改变 root node (and thus creating a new root)。

B 树的删除操作方式与插入非常相似。但是，删除可能导致 pairs of nodes to coalesce into a single node，而不是 splitting a node。merging adjacent nodes requires modification of parent nodes，并可能导致与插入类似的 rebalancing act。这些对插入和删除算法的描述并非 intended to be implementation guides，而是为了 give an idea of the process involved。如果你对这个主题感兴趣，你应该参考文件结构教科书以了解 B 树实现的 specifics，例如 Folk, Zoellick 和 Riccardi 的书。

B 树的另一个好处是它们的结构 inherently easy to store on disk。B 树中的每个节点通常是固定大小的，例如 1024 或 2048 字节，这个大小 nicely corresponds to 文件系统的 disk block size。将 B 树存储在单个文件中非常容易。B 树中节点之间的链接 simply the offsets in the file of the other nodes。因此，如果一个节点位于文件中的位置 15,360，存储指向它的指针 simply a matter of storing the value 15,360。 retrieving the node stored there requires seeking to that position in the file and reading the node。

随着键被添加到 B 树中，增长树所需的 simply to increase the size of the file that contains the B 树。尽管 splitting nodes and rebalancing a tree 可能看起来是 potentially expensive operation，但事实并非如此，因为无需移动 significant chunks of data。将一个节点 split into two involves allocating extra space at the end of the file，但其他 affected nodes只需更新其指针；无需重新排列数据来为新节点腾出空间。

好的，以下是原文的中文翻译：

#### B 树变体

标准 B 树有几种变体，其中一些甚至比传统 B 树具有更好的属性。最简单的修改是 B*树，它增加了节点在分裂之前可以达到的 fullness。通过增加每个节点中的键数量，我们降低了树的高度并加快了搜索速度。B 树的另一个更重要的变体是 B+树。B+树增加了所有键/值对只能驻留在叶节点中的限制。B+树的内部节点只包含索引值，用于引导搜索到正确的叶节点。存储在内部节点中的索引值是叶节点中键的副本，但索引值仅用于搜索，从不用于检索。有了这个扩展，将叶节点从左到右链接起来会很有用（例如，在上面定义的 B 树中，节点 able 将包含指向 ball 的链接，等等）。通过将叶节点链接在一起，可以轻松地 sequential over the contents of the B+tree。另一个好处是，内部节点可以与叶节点具有不同的格式，从而可以轻松地将尽可能多的数据 packed into an interior node (which makes for a more efficient tree)。

如果要索引的数据是文本字符串，可以应用另一种技术来 compact the tree。在 prefix B+tree 中，内部节点仅存储遍历树所需的最少键数据，并且仍然到达正确的叶节点。这种修改可以减少需要存储在内部节点中的数据量。通过减少内部节点中存储的信息量，prefix B+tree 比不进行压缩时保持更矮。

#### 哈希

哈希是另一种将数据存储在磁盘上的技术。哈希是一种技术，其中输入键通过一个函数生成键的哈希值。相同的键值应该总是生成相同的哈希值。哈希函数接受一个键并返回一个整数值。键的哈希值用于索引哈希表，通过对哈希值进行 modulo 表的大小来生成表中的有效索引。表中存储的项与 B 树一样，是键/值对。哈希的优势在于查找项的成本是常数：哈希函数独立于哈希表中的项数，因此查找效率极高。

除非事先知道所有输入值，否则输入键的哈希值并不总是唯一的。不同的键可能生成相同的哈希值。处理多个键碰撞到相同哈希值的一种方法是使用链表将所有哈希到相同表索引的值链接起来（即，每个表条目存储一个映射到该表条目的键/值对的链表）。另一种方法是使用第二个哈希函数进行 rehash，并继续 rehashing 直到找到一个空闲位置。链接是最常用的技术，因为它最容易实现并且具有 most well-understood properties。

哈希表的另一个缺点是哈希不保留键的顺序。这使得无法对哈希表中的项进行 in-order traversal。

作为索引方法，哈希的一个问题是，随着插入到表中的键的数量增加，碰撞的数量也随之增加。如果哈希表对于其中存储的键的数量来说太小，那么碰撞的数量将很高，并且查找条目的成本将显著上升（因为链只是一个链表）。大型哈希表减少了碰撞的数量，但也增加了 wasted space 的数量（表中没有任何内容的条目）。尽管可以更改哈希表的大小，但这是一项昂贵的任务，因为所有键/值对都需要 rehashed。调整哈希表大小的开销使其成为通用文件系统索引方法的非常困难的选择。

普通哈希的一种变体，可扩展哈希（extendible hashing），将哈希表分成两部分。在可扩展哈希中，有一个包含 bucket 指针目录的文件和一个 bucket 文件（包含数据）。可扩展哈希使用键的哈希值来索引 bucket 指针目录。最初并不使用哈希值的所有位。当一个 bucket 溢出时，解决方案是增加哈希值的位数，这些位数用作 bucket 指针目录中的索引。增加目录文件的大小是一个昂贵的操作。此外，使用两个文件使得可扩展哈希在文件系统中的使用变得复杂。

文件系统中的索引不应 unnecessarily waste space，并且应适应大型和小型索引。要提出一套能够满足所有这些标准、仍然保持 adequate efficiency 并且不需要 lengthy rehashing or reindexing operation 的哈希例程是很困难的。通过 additional work，可扩展哈希可以成为文件系统 B 树的 viable alternative。

#### 数据结构总结

对于文件系统而言，在哈希表和 B 树之间进行选择是一件容易的事情。哈希表存在的问题对于用作文件系统一部分的通用索引方法而言带来了 significant difficulties。调整哈希表大小可能会锁定整个文件系统很长一段时间，因为表正在调整大小并重新哈希元素，这对于通用用途来说是 unacceptable 的。另一方面，B 树在键很少时非常适合 compact sizes，随着键数量的增加可以轻松增长，并且保持良好的搜索时间（尽管不如哈希表好）。BFS 将 B+树用于其所有索引。

### 连接：索引与文件系统的其余部分

此时最 obvious 的问题是，如何维护索引列表？以及 individual indices live 在哪里？也就是说，索引 fit into 文件系统上存在的 standard set of directories and files 的何处？与属性一样，定义新的数据结构来维护此信息是很诱人的，但没有必要。BFS 使用正常的目录结构来维护索引列表。BFS 将每个索引的数据存储在位于 index directory 中的 regular files 中。

尽管可以将索引文件放入具有特殊保护的用户可见目录中，但 BFS  instead 将索引列表存储在文件系统创建时创建的 hidden directory 中。超级块存储 index directory 的 i-node number，从而建立了与文件系统其余部分的连接。超级块是存储此类隐藏信息的 convenient place。将索引存储在 hidden directory 中可以防止 accidental deletion of indices 或其他可能导致文件系统 catastrophic situation 的 mishap。将索引存储在 hidden directory 中的缺点是它需要特殊的 API 来访问。这是一种 either way 都可以的决定，几乎没有repercussions。操作和访问索引的 API 很简单。操作 entire indices 的操作包括：

- create index
- delete index
- open index directory
- read index directory
- stat index

很容易扩展此操作列表以支持其他 common file operations (rename 等)。但是由于对索引 such operations 需求不大，BFS 选择不提供该功能。

create index 操作只需一个索引名称和索引的数据类型。索引的名称将索引与其将使用的相应属性连接起来。例如，BeOS 邮件守护程序为其收到的所有电子邮件添加一个名为 MAIL:from 的属性，并且它还创建一个名称为 MAIL:from 的索引。索引的数据类型应与属性的数据类型匹配。BFS 支持以下索引数据类型：

- 字符串 (最多 255 字节)
- 整数 (32 位)
- 整数 (64 位)
- 浮点数
- 双精度浮点数

当然也可以支持其他类型，但这组数据类型涵盖了 most general functionality。实际上，几乎所有索引都是字符串索引。

创建索引时的一个“gotcha”是，索引的名称可能与 already have that attribute 的文件匹配。例如，如果一个文件有一个名为 Foo 的属性，并且一个程序创建了一个名为 Foo 的索引，那么 already had the attribute 的文件不会被添加到新创建的索引中。困难在于， without iterating over all files，没有 easy way 来确定哪些文件具有该属性。因为创建索引是一个相对 uncommon 的 occurrence，所以 iterating over all the files 来查找 already have the attribute 的文件可能是 acceptable 的。BFS 不这样做，而是将责任推给应用程序开发人员。BFS 的这个 deficiency 是 unfortunate 的，但在开发计划中没有时间来解决它。

删除索引是一个 straightforward 操作。从 index directory 中删除包含索引的文件是 necessary 的。尽管 easy，但删除索引应该是一个 rare operation，因为 re-creating the index 将不会 reindex all the files that have the attribute。因此，只有当使用它的唯一应用程序从系统中移除并且索引为空（即，没有文件具有该属性）时，才应该删除索引。

其余的索引操作是简单的 housekeeping functions。index directory functions (open, read, and close) 允许程序 iterating over the index directory 就像程序 iterating over a regular directory 一样。stat index 函数允许程序 check for the existence of an index 并获取关于索引大小的信息。这些例程 all have trivial implementations，因为 involved 的所有数据结构与 regular directories and files 的完全相同。

#### 自动索引

除了允许用户创建自己的索引外，BFS 还支持 integral file attributes 的内置索引：名称、大小和上次修改时间。文件系统本身必须创建和维护这些索引，因为它是维护这些文件属性的一方。请记住，文件的名称、大小和上次修改时间不是 regular attributes；它们是 i-node 的 integral parts，不受属性代码管理。

名称索引维护系统上所有文件名称的列表。每次文件名称更改（创建、删除或重命名）时，文件系统也必须更新名称索引。在文件的所有其他内容成功创建（i-node 分配和目录更新）后，会将新的文件名称添加到名称索引中。然后将文件名称添加到名称索引中。向名称索引的插入必须作为文件创建事务的一部分发生，以便在系统发生故障时，整个操作作为一个事务被 undone。尽管这种情况很少发生，但如果无法将文件名称添加到名称索引中（例如，没有剩余空间），那么整个文件创建必须被 undone。

删除文件名称的 problematic slightly less，因为它不太可能失败（驱动器上不需要额外空间）。然而，再次强调，从文件名称索引中删除名称应该是 last operation，并且应该作为删除文件的事务的一部分完成，以便整个操作是 atomic 的。

重命名操作是实现中最 tricky 的操作（通常情况下以及维护索引而言）。正如所料，更新名称索引是作为重命名事务的一部分最后完成的事情。重命名操作本身分解为删除原始名称（如果存在）并将新名称插入索引中。无法插入新名称的 undoing particularly problematic。如果新名称 already existed，重命名操作可能已经删除了一个文件（这是重命名成为原子操作所必需的）。然而，因为另一个文件被删除（及其资源被释放），undoing such an operation 是 extremely complex。由于 involved 的复杂性以及即使发生也 unlikely 的事件，BFS does not attempt to handle this case。如果重命名操作无法将文件的新名称插入到名称索引中，文件系统仍然是 consistent 的，只是 not up-to-date（并且磁盘很可能 100% 已满）。

大小索引的 updates 发生在文件更改大小时。作为一种优化，文件系统 only updates the size index when a file is closed。这 prevents the file system from having to lock and modify the global size index for every write to any file。缺点是 size index 可能与 actively being written 的某些文件 slightly out-of-date。稍微 out-of-date 与每次写入都更新 size index 之间的 trade-off 是 well worth it 的——性能损失是 quite significant 的。

size index 可能成为 severe bottleneck 的另一种情况是，当有许多相同大小的文件时。这可能看起来像 an unusual situation，但当运行创建和删除大量文件以测试文件系统速度的文件系统 benchmark 时，这种情况surprisingly often 发生。许多相同大小的文件将 stress the index structure 以及它如何处理 duplicate keys。BFS 在这方面 fares moderately well，但随着 duplicates 数量的增加，性能呈 nonlinear 方式下降。目前，超过 10,000 个或更多的 duplicates 会导致 size index 的 modifications 性能明显 lag。

上次修改时间索引是 BFS 索引的 final inherent file attribute。索引上次修改时间使得用户可以轻松地查找 recently created files 或 no longer needed 的 old files。正如所料，上次修改时间索引在文件关闭时 receive updates。更新包括删除旧的上次修改时间并插入新的时间。

知道像上次修改时间索引这样的 inherent index 对于系统性能至关重要，BFS 使用了一种 slightly underhanded technique 来提高索引的 efficiency。由于上次修改时间的 granularity only 1-second，并且可以在 1 秒内创建许多数百个文件，BFS 将标准的 32 位时间变量 scaled to 64 bits，并添加了一个 small random component 以减少 potential number of duplicates。在进行比较或向/从用户传递信息时，random component 被 masked off。回顾来看，本可以使用 64 位 microsecond resolution timer 并进行类似的时间值 masking，但由于 POSIX API only support 32 位时间值 with 1-second resolution，定义一套新的 parallel set of APIs just to access a larger time value 没有 much point。

除了这三个 inherent file attributes 外，还有其他属性也可以被索引。早期版本的 BFS 确实索引了文件的 creation time，但我们认为这个索引不值得 its performance penalty。通过消除 creation time index，文件系统在文件创建和删除 benchmark 中获得了 roughly 20% 的 speed boost。 trade-off 是 impossible to use an index 来搜索文件的 creation time，但我们 did not feel that this presented much of a loss。同样，本可以索引文件 access permissions、ownership information 等，但我们选择不这样做，因为维护索引的成本 outweighed the benefit they would provide。具有不同约束的其他文件系统可能会做出不同的选择。

好的，以下是原文的中文翻译：

#### 其他属性索引

除了名称、大小和上次修改时间这些固有索引之外，可能还有任意数量的其他索引。每个索引都对应着程序存储在文件中的一个属性。如前所述，BeOS 邮件系统将收到的电子邮件存储在独立的文件中，为每个文件标记属性，例如邮件来自何人、发给何人、发送时间、主题等等。邮件系统首次运行时，会为其写入的每个属性创建索引。当邮件守护程序将这些属性之一写入文件时，文件系统会注意到该属性名称具有相应的索引，因此会更新索引以及文件中的属性值。

对于属性的每一次写入，文件系统还必须在索引目录中查找，以查看属性名称是否与索引名称相同。虽然这看起来可能会减慢系统速度，但索引的数量通常很少（通常少于 100 个），并且查找属性的成本很低，因为数据 almost always cached。当写入属性时，文件系统还会检查文件是否 already had the attribute。如果是，必须首先从索引中删除旧值。然后，文件系统可以将新值添加到文件，并将该值插入到相应的属性索引中。所有这些都对用户程序 transparently 发生。

当用户程序从文件中删除一个属性时，会发生类似的一系列操作。文件系统必须检查正在删除的属性名称是否具有索引。如果是，它必须从索引中删除属性值，然后从文件中删除属性。

索引的维护使得属性处理变得复杂，但这是必要的。索引的自动管理使程序无需处理此问题，并向程序提供了保证：如果属性索引存在，文件系统将使其与索引创建后写入的所有属性的状态保持一致。

### BFS B+树

BFS 使用 B+树来存储目录的内容和所有索引信息。BFS 的 B+树实现是 Folk 和 Zoellick 文件结构第一版教科书中所述 B+树的 loosely derived 版本，并且在很大程度上得益于 Marcus J. Ranum 对该数据结构的公共实现。B+树代码支持存储可变大小的键以及单个磁盘偏移量（在 BFS 中是一个 64 位量）。存储在树中的键可以是字符串、整数（32 位和 64 位）、浮点数或双精度浮点数。与原始数据结构最大的不同是增加了对在 B+树中存储重复键的支持。

#### API

B+树的接口也相当简单。API 有六个主要函数：

- 打开/创建 B+树
- 插入键/值对
- 删除键/值对
- 查找键并返回其值
- 转到树的开头/结尾
- 遍历树的叶节点（向前/向后）

创建 B+树的函数有几个参数，允许指定 B+树的节点大小、要存储在树中的数据类型以及各种其他内务管理信息。选择 B+树的节点大小很重要。无论文件系统的块大小如何，BFS 都使用 1024 字节的节点大小。确定节点大小是实验和实践的简单事情。BFS 支持长达 255 个字符的文件名，这使得 512 字节的 B+树节点大小太小了。较大的 B+树往往会浪费空间，因为每个节点 never 100% full。这对于小型目录来说尤其是一个问题。选择 1024 字节的大小作为合理的折衷。

插入例程接受一个键（其类型应与 B+树的数据类型匹配）、键的长度和一个值。该值是一个 64 位 i-node number，用于标识哪个文件对应于存储在树中的键。如果键是现有键的重复且树不允许重复，则返回错误。如果树支持重复，则插入新值。在重复的情况下，该值被用作次要键，并且必须是唯一的（插入相同的键/值对两次被视为错误）。

删除例程接受一个键/值对作为输入，并将在树中搜索该键。如果找到该键且不是重复项，则从树中删除该键及其值。如果找到该键且它有重复条目，则在重复项中搜索传入的值并删除该值。

最基本的操作是在 B+树中搜索一个键。查找操作接受一个输入键并返回关联的值。如果键包含重复条目，则返回第一个。

其余函数支持树的遍历，以便程序可以迭代树中的所有条目。可以向前或向后遍历树。也就是说，向前遍历返回按字母或数字升序排列的所有条目。向后遍历树返回按降序排列的所有条目。

#### 数据结构

B+树 API 的简洁性掩盖了底层数据结构的复杂性。在磁盘上，B+树是节点的集合。所有 B+树中的第一个节点都是一个 header node，其中包含一个描述 B+树其余部分的简单数据结构。本质上，它是 B+树的超级块。

结构体是：

```c
long magic;
int node_size;
int max_number_of_levels;
int data_type;
off_t root_node_pointer;
off_t free_node_pointer;
off_t maximum_size;
```

magic 字段仅仅是一个 magic number，用于标识块。像这样存储 magic numbers 有助于在发生 corruption 时 reconstructing file systems。下一个字段 node size 是树的节点大小。树中的每个节点始终是相同大小的（包括 B+树 header node）。下一个字段 max number of levels 指示 B+树的深度有多少层。树的这个深度对于各种内存数据结构是必需的。data type 字段编码存储在树中的数据类型（32 位整数、64 位整数、浮点数、双精度浮点数或字符串）。

root node pointer 字段是最重要的字段。它包含 B+树文件中树的 root node 的偏移量。没有 root node 的地址，不可能使用树。必须始终读取 root node 才能对树进行任何操作。root node pointer，与所有磁盘偏移量一样，是一个 64 位量。

free node pointer 字段包含树中第一个 free node 的地址。当删除导致整个节点变空时，该节点被 linked into a list，该列表从文件中此偏移量开始。通过将 free nodes 链接在一起，维护 free nodes 列表。存储在每个 free node 中的链接 simply the address of the next free node (and the last free node has a link address of 1)。

最后一个字段 maximum size 记录 B+树文件的最大大小，用于 error-check node address requests。当请求一个新节点且没有 free nodes 时，也使用 maximum size 字段。在这种情况下，B+树文件 simply extended by writing to the end of the file。新节点的地址是 maximum size 的值。然后，maximum size 字段根据 node size 变量中包含的数量递增。

B+树中内部节点和叶节点的结构是相同的。有一个 short header，后面跟着 packed key data、键的长度，最后是与每个键 associated values。header 足以区分叶节点和内部节点，并且，与所有 B+树一样，只有叶节点包含用户数据。节点的结构是：

```c
off_t left link;
off_t right link;
off_t overflow link;
short count of keys in the node;
short length of all the keys;
key data;
short key length index;
off_t array of the value for each key;
```

left 和 right links 用于叶节点将它们链接在一起，以便轻松地进行树的 in-order traversal。overflow link 用于内部节点，并引用 effectively continues this node 的另一个节点。count of the keys in the node 仅仅记录此节点中存在多少个键。length of all the keys 被添加到 header 的大小，然后向上舍入到四的倍数，以达到 key length index 的开头。key length index 中的每个 entry 存储键的结束偏移量（要计算节点中的 byte position，header size 也必须添加）。也就是说，索引中的第一个 entry 包含 first key 的结束偏移量。可以通过减去前一个 entry 的长度来计算键的长度（第一个元素的长度 simply the value in the index）。following the length index 是 key values 数组（与键一起存储的值）。对于内部节点，与键关联的值是 corresponding node 的偏移量，该节点包含小于此键的元素。对于叶节点，与键关联的值是用户传入的值。

#### 重复项

除了树的内部节点和叶节点外，还有存储键重复项的节点。出于效率原因，重复项的处理相当复杂。BFS 使用的 B+树中有两种类型的重复节点：重复碎片节点（duplicate fragment nodes）和完全重复节点（full duplicate nodes）。重复碎片节点包含几个不同键的重复项。完全重复节点只存储一个键的重复项。

存在碎片节点类型的区别是因为具有少量重复键比具有大量重复键更常见。也就是说，如果几个不同目录中有几个同名文件，则重复名称的数量可能少于八个。实际上，对各种系统的简单测试显示，多达 35% 的所有文件名都是重复项，且重复项数量小于或等于八个。高效处理这种情况很重要。早期版本的 BFS B+树 did not use duplicate fragments，我们发现在 duplicating a directory hierarchy 时，所有 I/O 的 significant chunk 是为了处理名称和大小索引中的重复项。通过添加对 duplicate fragments 的支持，我们能够显著减少发生的 I/O 量，并将 duplication a folder 的时间加快了 nearly a factor of two。

当 duplicate entry 必须插入到叶节点中时，instead of storing the user’s value，系统存储一个特殊值，该值是指向 fragment node 或 full duplicate node 的指针。该值是特殊的，因为它 has its high bit(s) set。BFS B+树代码 reserves the top 2 bits of the value field to indicate if a value refers to duplicates。通常情况下，这 would not be acceptable，但由于文件系统 only stores i-node numbers in the value field，我们可以 assured that this will not be a problem。尽管这种 attitude 历史上在系统增长时 caused all sorts of headaches，我们在此处 are free from guilt。这种方法的安全性 stems from the fact that i-node numbers are disk block addresses，所以它们 are at least 10 bits smaller than a raw disk byte address (because the minimum block size in BFS is 1024 bytes)。Since the maximum disk size is 264 bytes in BeOS and BFS uses a minimum of 1024-byte blocks，the maximum i-node number is 254。值 254 足够小，它不会 interfere with the top 2 bits used by the B+树代码。

当 duplicate key 被插入到 B+树中时，文件系统 looks to see if any other keys in the current leaf node already have a duplicate fragment。如果存在具有 additional fragment 空间的 duplicate fragment node，我们将 duplicate value 插入到该节点内的一个新 fragment 中。如果 current node 中没有 other duplicate fragment nodes referenced，我们创建一个新的 duplicate fragment node 并将 duplicate value 插入其中。如果要添加的键 already has duplicates，我们将 duplicate 插入到 fragment 中。如果 fragment 已满（it can only hold eight items），我们分配一个 full duplicate node，并将 existing duplicates 复制到新节点中。full duplicate node 包含比 fragment 更多的 duplicates 空间，但可能仍然有更多的 duplicates。为了管理任意数量的 duplicates，full duplicate nodes contain links (forwards and backwards) to additional full duplicate pages。duplicates 列表 based on the value associated with the key (i.e., the i-node number of the file that contains this key value as an attribute) is kept in sorted order。当 duplicate 数量超过 10,000 个左右时，这种 duplicates 的线性列表访问起来会变得 extremely slow。不幸的是，在 BFS 开发期间没有时间探索更好的解决方案（例如存储另一个以 i-node values 为键的 B+树）。

#### 集成

在抽象层面上，我们描述的结构与文件系统的其余部分没有连接；也就是说，它存在，但它如何与文件系统的其余部分集成并不清楚。BFS 的 fundamental abstraction 是存储数据的 i-node。所有东西都是基于这个最基本的 abstraction 构建的。BFS 用于存储目录和索引的 B+树是 built on top of i-nodes。也就是说，i-node 管理分配给 B+树的磁盘空间，B+树将该磁盘空间的内容组织成 rest of the system 用于查找信息的索引。

B+树使用两个例程 `read data stream()` 和 `write data stream()` 来访问文件数据。这些例程 directly operate on i-nodes，并提供 BFS 中文件数据的 lowest level of access。尽管它们是 low-level 的，`read/write data stream()` 具有与大多数程序员 familiar 的 higher-level `read()` 和 `write()` 调用非常相似的 API。在此 low-level I/O 之上，B+树代码实现了 previously discussed 的功能。文件系统的其余部分 wraps around the B+树 functionality，并使用它来提供目录和索引 abstraction。例如，creating a new direc- tory involves creating a file and putting an empty B+tree into the file。当程序需要 enumerating the contents of a directory 时，文件系统 requests an in-order traversal of the B+树。opening a file contained in a di- rectory is a lookup operation on the B+树。lookup operation (if successful) 返回的值是 named file 的 i-node（它又用于 gain access to the file data）。creating a file inserts a new name/i-node pair into the B+树。同样，deleting a file simply removes a name/i-node pair from a B+树。索引使用 B+树的方式与目录 similar，但允许 duplicates where a directory does not。
