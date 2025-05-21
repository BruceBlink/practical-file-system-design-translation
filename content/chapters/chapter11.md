---
typora-root-url: ./..\..\public\
---
# 用户级 API (User-Level API)

在 BeOS 上，有两种用户级 API 可用于访问文件和目录。BeOS 支持 **POSIX 文件 I/O API**，它提供了路径名和文件描述符的标准概念。此 API 有一些扩展，允许访问属性、索引和查询。我们只会简要讨论标准的 POSIX API，并花更多时间在扩展上。访问 BeOS 上文件的另一个 API 是 **C++ Storage Kit**。C++ API 是一个完整的类层次结构，旨在让 C++ 程序员感到宾至如归。本章大部分时间将讨论 C++ API。然而，本章并非旨在作为编程手册。（有关本章中提及函数的更多具体信息，请参阅《Be 开发者指南》）。

## 11.1 POSIX API 及 C 语言扩展 (The POSIX API and C Extensions)

所有标准的 POSIX 文件 I/O 调用，例如 `open()`、`read()`、`write()`、`dup()`、`close()`、`fopen()`、`fprintf()` 等等，在 BeOS 上都能按预期工作。直接操作文件描述符的 POSIX 调用（即 `open()`、`read()` 等）是**直接的内核调用**。内核提供的文件描述符模型直接支持 POSIX 文件描述符模型。尽管一些 BeOS 开发者曾施压要发明新的文件 I/O 机制，但我们决定不重复造轮子。即使是 BeOS C++ API，其 C++ 外壳之下也使用了文件描述符。POSIX 文件 I/O 模型工作得很好，我们认为改变该模型没有任何优势。

### 属性函数 (Attribute Functions)

C 语言接口的属性功能包含**八个函数**。前四个函数提供了一种**枚举与文件关联属性**的方法。一个文件可以有任意数量的属性，与文件关联的属性列表以**属性目录**的形式呈现。访问与文件关联的属性列表的 API 几乎与 POSIX 目录函数（`opendir()`、`readdir()` 等）完全相同：

- `DIR *fs_open_attr_dir(char *path);`
- `struct dirent *fs_read_attr_dir(DIR *dirp);`
- `int fs_rewind_attr_dir(DIR *dirp);`
- `int fs_close_attr_dir(DIR *dirp);`

此 API 与 POSIX 目录 API 的相似性使其能够立即被任何熟悉 POSIX API 的程序员使用。我们在这里和其他地方的意图是重用程序员已经熟悉的概念。`fs_read_attr_dir()` 返回的每个命名条目都对应于 `fs_open_attr_dir()` 给定路径所指向文件的**一个属性**。

接下来的四个函数提供对**单个属性的访问**。同样，我们坚持使用 POSIX 程序员熟悉的概念。第一个例程返回有关特定属性的更详细信息：

- `int fs_stat_attr(int fd, char *name, struct attr_info *info);`

此函数用指定属性的**类型和大小**填充 `attr_info` 结构。

值得注意的是这里选择的 API 风格：为了识别文件的属性，程序员必须指定**属性所关联的文件描述符**和**属性的名称**。这也是其余属性函数的风格。如第 10 章所述，将属性变成完整的文件描述符会使文件删除变得**异常复杂**。不将属性视为文件描述符的决定体现在这里的用户级 API 中，其中属性总是通过提供文件描述符和名称来识别。

下一个函数从文件中**删除一个属性**：

- `int fs_remove_attr(int fd, char *name);`

在此调用之后，该属性不再存在。此外，如果属性名称被索引，则该文件将从关联的索引中移除。

接下来的两个函数提供了读写属性的 I/O 接口：

- `ssize_t fs_read_attr(int fd, char *name, uint32 type, off_t pos, void *buffer, size_t count);`
- `ssize_t fs_write_attr(int fd, char *name, uint32 type, off_t pos, void *buffer, size_t count);`

此 API 严格遵循我们在较低层描述的内容。每个属性都有一个名称、一个类型以及与名称关联的数据。文件系统可以使用类型代码来确定是否可以**索引**该属性。如果指定名称的属性不存在，`fs_write_attr()` 会创建它。这两个函数完善了 POSIX 风格 API 对属性的接口。

### 索引函数 (Index Functions)

索引功能的接口仅由简单的 C 语言接口提供。没有对应的 C++ API 用于索引例程。这并非反映了我们的语言偏好，而是认识到为这些例程编写 C++ 包装器**获益甚微**。索引 API 提供了遍历卷上索引列表以及创建和删除索引的例程。用于遍历卷上索引列表的例程是：

- `DIR *fs_open_index_dir(dev_t dev);`
- `struct dirent *fs_read_index_dir(DIR *dirp);`
- `int fs_rewind_index_dir(DIR *dirp);`
- `int fs_close_index_dir(DIR *dirp);`

同样，此 API 与 POSIX 目录函数非常相似。`fs_open_index_dir()` 接受一个 `dev_t` 参数，vnode 层通过它知道要操作哪个卷。`fs_read_index_dir()` 返回的条目提供了每个索引的名称。要获取有关索引的更多信息，调用是：

- `int fs_stat_index(dev_t dev, char *name, struct index_info *info);`

`fs_stat_index()` 调用返回一个类似 `stat` 结构的信息，其中包含有关命名索引的类型、大小、修改时间、创建时间和所有权等字段，这些都包含在 `index_info` 结构中。

创建索引通过以下方式完成：

- `int fs_create_index(dev_t dev, char *name, int type, uint flags);`

此函数在指定卷上创建命名索引。`flags` 参数目前未使用，但将来可能指定其他选项。索引具有由 `type` 参数指示的数据类型。支持的类型有：

- 整数（有符号/无符号，32-/64-位）
- 浮点数
- 双精度浮点数
- 字符串

文件系统可以允许其他类型，但这些是 BFS 支持的数据类型（目前 BeOS 上唯一支持索引的文件系统是 BFS）。

索引的名称应与将添加到文件的属性的名称对应。文件系统创建索引后，所有添加了名称（和类型）与此索引匹配的属性的文件，其属性值也将添加到索引中。

删除索引几乎太容易了：

- `int fs_remove_index(dev_t dev, char *name);`

调用 `fs_remove_index()` 后，索引即被删除，不再存在。删除索引是一个**严肃的操作**，因为一旦索引被删除，其中包含的信息无法轻易重新创建。删除仍然需要的索引可能会干扰需要该索引的程序的正常运行。几乎无法防止某人无意中删除索引，因此除了命令行工具（调用此函数）之外，**不提供**其他接口来删除索引。

### 查询函数 (Query Functions)

查询是关于文件属性的表达式，例如 `name = foo` 或 `MAIL:from != pike@research.att.com`。查询的结果是**匹配表达式的文件列表**。遍历匹配文件列表的显而易见的 API 风格是标准的目录风格 API：

- `DIR *fs_open_query(dev_t dev, char *query, uint32 flags);`
- `struct dirent *fs_read_query(DIR *dirp);`
- `int fs_close_query(DIR *dirp);`

尽管此 API 看起来异常简单，但它与一个非常强大的机制连接。通过查询，程序可以将文件系统用作**数据库**，以基于其在层次结构中固定位置以外的条件来查找信息。`fs_open_query()` 参数接受一个设备参数，指示在哪个卷上执行查询；一个表示查询的字符串；以及一个（目前未使用的）`flags` 参数。文件系统使用查询字符串查找与表达式匹配的文件列表。每个匹配的文件都通过连续调用 `fs_read_query()` 返回。不幸的是，返回的信息不足以获取文件的完整路径名。C API 在这方面有所欠缺，需要一个函数将 `dirent` 结构转换为完整的路径名。尽管在大多数版本的 Unix 上不可行，但在 BeOS C++ API 中，从 `dirent` 到完整路径名的转换是可能的。

查询的 C API 也不支持**实时查询**。这很不幸，但发送实时查询更新的机制本质上是基于 C++ 的。尽管可以提供包装器来封装 C++ 代码，但没有足够的动机这样做。查询的 C 接口是为了在调试阶段（在 C++ API 编码之前）支持原始测试应用程序，并允许 C 程序访问扩展的 BFS 功能而编写的。未来可能会进一步改进查询的 C 接口，使其更有用。

### 卷函数 (Volume Functions)

这最后一组 C 语言接口提供了一种方法来**查找文件的设备 ID**，**遍历可用设备 ID 列表**，并**获取由设备 ID 表示的卷的信息**。这三个函数是：

- `dev_t dev_for_path(char *path);`
- `int fs_stat_dev(dev_t dev, fs_info *info);`
- `dev_t next_dev(int32 *pos);`

第一个函数 `dev_for_path()` 返回包含 `path` 所指向文件的卷的设备 ID。此调用没有什么特别之处；它只是一个便捷调用，是 POSIX 函数 `stat()` 的一个包装。

`fs_stat_dev()` 函数返回有关指定设备 ID 标识的卷的信息。返回的信息类似于 `stat` 结构，但包含诸如设备的块总数、已使用块数、卷上的文件系统类型以及指示文件系统支持哪些功能（查询、索引、属性等）的标志等字段。这是 `df` 等命令行工具打印信息时使用的函数。

`next_dev()` 函数允许程序**遍历所有设备 ID**。`pos` 参数是指向一个整数的指针，在第一次调用 `next_dev()` 之前应将其初始化为零。当没有更多设备 ID 可返回时，`next_dev()` 返回一个错误代码。使用此例程，可以轻松遍历所有挂载的卷，获取它们的设备 ID，然后对该卷执行或使用它（例如，执行查询，获取卷的卷信息等）。

### POSIX API 和 C 语言总结 (POSIX API and C Summary)

BeOS 提供的 C API 涵盖了所有标准的 POSIX 文件 I/O，并且扩展具有非常 POSIX 化的感觉。保持 API 熟悉的设计理念推动了扩展 API 的设计。这些函数允许 C 程序**以最小的麻烦**访问 BeOS 提供的大多数功能。
