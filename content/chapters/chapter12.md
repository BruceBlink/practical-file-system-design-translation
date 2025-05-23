---
typora-root-url: ./..\..\public
---



# 测试 (Testing)

软件测试通常是随意进行的，是事后才想到的，主要是为了确保没有明显的错误。然而，文件系统是系统软件的关键组成部分，用户必须绝对依赖它来安全可靠地存储数据。作为计算机系统永久数据的主要存储库，文件系统必须承担 **100%可靠性**的重担。文件系统的测试必须彻底且极其严格。未经深思熟虑或细心测试的文件系统很可能不可靠。

不可能发布规定测试应该如何进行的指令，也不是本章的重点。相反，其目的是介绍**如何对文件系统进行压力测试**，以便在系统发布之前尽可能多地发现错误。

## 12.1 辅助措施 (The Supporting Cast)

在设计测试计划和编写测试之前，文件系统应该以**永远不损坏用户数据**为目标来编写。在实践中，这意味着几件事：

- **充分利用运行时一致性检查**。相对于磁盘访问的成本，它们是廉价的，因此基本上是免费的。
- 在使用数据结构之前**验证其正确性**有助于及早发现问题。
- 检测到损坏时**停止系统**比不检查继续运行更好。
- 添加有用的**调试消息**和编写好的**调试工具**在诊断问题时可以节省大量时间。

出于性能原因，生产代码中的数据结构运行时检查通常会被禁用。幸运的是，在文件系统中，磁盘访问的成本远远超过 CPU 时间，因此即使在生产系统中禁用运行时检查也是愚蠢的。实际上，BFS 在启用或禁用运行时检查时，性能差异可以忽略不计。好处是，即使在生产系统中，你也可以合理地确信，如果发生意外错误，系统会检测到它并通过停止系统来防止损坏。

在 BFS 中，在使用数据结构之前验证其正确性被证明是**无价的调试辅助**。例如，在每个文件系统入口点，任何传入的 i-node 数据结构在使用前都会经过验证。i-node 数据结构对于系统的正确运行至关重要。因此，一个简单的宏或函数调用来验证 i-node 是极其有用的。例如，在 BFS 中，`CHECK_INODE()` 宏验证 i-node 魔数、文件大小、i-node 大小以及与 i-node 关联的内存中指针。在 BFS 的开发过程中，这种检查多次捕获并防止了由于野指针引起的磁盘损坏。然后停止系统允许使用调试器进行更仔细的检查，以确定发生了什么。

## 12.2 数据结构验证示例 (Examples of Data Structure Verification)

BFS 使用一个名为**数据流**的数据结构来枚举哪些磁盘块属于文件。数据流结构使用**扩展区 (extents)** 来描述属于文件的块运行。间接块和双间接块具有略微不同的约束，这在操作数据流结构时导致了很大的复杂性。数据流结构是存储用户数据最关键的结构。如果数据流引用了不正确的磁盘位置或不正确地访问了磁盘的某个部分，那么用户数据就会损坏。文件系统会对数据流结构执行大量检查以确保其正确性：

- 当前文件位置是否超出范围？
- 当前文件位置是否有有效的文件块？
- 分配给文件大小的块是否太少？
- 文件中间的块是否意外地空闲？

每次对文件的访问都会将当前文件位置转换为磁盘块地址。上述大部分检查都在执行从文件位置到磁盘块地址转换的例程中执行。文件的双间接块会收到额外的一组一致性检查，因为它们受到额外的约束（每个扩展区都是固定大小等）。在更改文件大小时（无论是增长还是缩小），还会对数据流结构进行进一步检查。

除了上述一致性检查之外，操作数据流结构的代码还必须对其他 BFS 函数的结果进行**错误检查**。例如，在文件增长时，会**健全性检查**块分配函数返回的块号，以确保系统其他部分的错误不会造成损害。这种**防御性编程**风格可能看起来不必要，但交叉检查其他模块的正确性有助于确保系统某个部分的错误不会导致另一个模块崩溃或写入磁盘上的不正确位置。

BFS 还在大量情况下检查**不可能发生的情况**。不可能发生的情况是那些不应该发生但总是会发生的情况。例如，在文件数据流中定位数据块时，可能会遇到一个指向零块而不是有效块号的块运行。如果文件系统没有检查这种情况（这当然永远不应该发生），它可能会允许程序覆盖文件系统超级块，从而破坏关键的文件系统信息。如果未进行检查并且超级块被覆盖，则很可能在损坏发生很久之后才检测到错误。不可能发生的情况几乎总是在调试系统时出现，因此即使看起来不太可能，检查它们也总是有益的。

当文件系统检测到不一致状态时，最好简单地**停止文件系统**，或者至少停止特定的执行线程。BFS 通过进入一个打印恐慌消息然后无限循环的例程来实现这一点。停止系统（或至少停止特定的执行线程）允许程序员进入调试器并检查系统的状态。在生产环境中，这通常会导致系统锁定，虽然这相当不可接受，但它优于损坏的硬盘。

## 12.3 调试工具 (Debugging Tools)

文件系统的早期开发可以在用户级别完成，通过构建一个测试工具，将文件系统的核心功能与一组简单的 API 调用连接起来，供测试程序调用。开发测试环境允许文件系统开发者使用**源代码级调试工具**来使基本功能正常工作并快速原型化设计。在用户级别调试文件系统比典型的内核开发周期（涉及崩溃后重启，并且通常不提供用户级源代码调试的奢侈）要好得多。

尽管每个系统的调试环境都有其独特之处，但几乎总有一个基本的功能级别。最基本的调试功能是**转储内存**和获取**堆栈回溯**的能力，堆栈回溯显示了在当前状态之前调用了哪些函数。

BeOS 内核的调试环境基于一个**原始的内核监视器**，可以通过特殊的击键或特殊的不可屏蔽中断 (NMI) 按钮进入。一旦进入监视器，程序员可以检查系统状态并通常进行探查。这个监视器环境支持**动态添加调试器命令**。文件系统向监视器添加了许多命令，以易于阅读的格式（而不是原始十六进制转储）打印各种文件系统数据结构。

良好调试工具的重要性怎么强调都不为过。在 BFS 的开发过程中，测试中多次出现错误，能够输入几个命令来检查各种结构的状态，这使得查找错误——或至少诊断问题——**变得容易得多**。（尽管这种情况仍然发生，但如果没有这些工具，情况可能会糟糕得多）。

文件系统调试命令总共有 18 个函数，其中 7 个至关重要。最重要的命令是：

- 转储超级块
- 转储 i-node
- 转储数据流
- 转储 i-node 的嵌入属性
- 在缓存中查找块（通过内存地址或块号）
- 列出线程的打开文件句柄
- 在所有打开的文件中查找 vnode-id

这套工具使得快速检查最重要的数据结构成为可能。如果 i-node 损坏，快速转储结构会显示哪些字段已损坏，通常再执行几个命令就会揭示损坏是如何发生的。

## 12.4 数据结构调试设计 (Data Structure Design for Debugging)

除了好的工具之外，还有其他几个因素有助于调试 BFS。几乎所有文件系统数据结构都包含一个**魔数 (magic number)**，用于标识数据结构的类型。数据结构成员的顺序被选择为**最小化损坏的影响**，并使其在发生损坏时易于检测。魔数在数据结构中出现得较早，这样可以很容易地检测一块内存是什么，并允许数据结构在数据结构之前的内存中存在少量溢出时存活。例如，如果内存包含：

```c
|字符串数据 | I-Node 数据
```

如果字符串覆盖了额外的一两个字节，大部分 i-node 数据将存活下来，尽管其魔数将损坏。损坏的魔数很容易检测到，并且损坏的类型通常非常明显（零字节或某些 ASCII 字符）。这有助于防止将损坏的数据写入磁盘，并有助于诊断出错了什么（字符串的内容通常会指出“罪魁祸首”，然后很容易修复有问题的代码）。

一种非常典型的文件系统错误是混淆元数据块，并将 i-node 写入属于目录的块，反之亦然。使用魔数，这些类型的损坏很容易检测。如果一个块具有目录头块的魔数，或者磁盘上的 B+tree 页包含 i-node 的内容，那么就可以更容易地通过代码追溯，查看错误是如何发生的。

通过**少量的预先考虑**来设计数据结构布局可以帮助调试，并使许多常见的错误既易于检测又易于纠正。由于文件系统是一个复杂的软件，调试它通常相当困难。发生的错误只在长时间运行后才会出现，并且不容易重现。魔数、数据成员的智能布局以及用于检查数据结构的良好工具都有助于**显著**诊断和修复文件系统错误。

## 12.5 测试类型 (Types of Tests)

我们可以针对文件系统运行三种类型的测试：**合成测试 (synthetic tests)**、**真实世界测试 (real-world tests)** 和**最终用户测试 (end user testing)**。合成测试旨在暴露特定领域（文件创建、删除等）的缺陷或测试系统的限制（填满磁盘、在单个目录中创建许多文件等）。真实世界测试以与合成测试不同的方式对系统施加压力，并提供最接近真实世界使用的近似值。最后，最终用户测试是用户以真实用户可能使用的所有不寻常方式使用系统，试图混淆文件系统。

### 合成测试 (Synthetic Tests)

运行合成测试具有吸引力，因为它们提供了一个**受控环境**，并且可以配置为写入已知的数据模式，这有助于调试。每个合成测试都会生成文件系统流量的随机模式。为了确保可重复性，所有测试都会打印它们使用的随机种子，并支持命令行选项来指定随机种子。每个测试还支持各种可配置参数，以修改测试程序的运行方式。这很重要，否则运行测试会退化为重复狭窄的访问模式。编写支持各种可配置参数的合成测试对于成功的测试极其重要。

用于对 BFS 进行压力测试的合成测试套件包含以下程序：

- **磁盘碎片整理器 (Disk fragmenter)**：将创建随机或固定大小的文件，每个目录一定数量，当收到磁盘空间不足错误时，它会返回并删除它创建的其他文件。在 BFS 的情况下，这会完美地使磁盘碎片化，并且通过调整创建文件的大小以匹配文件系统块大小，可以使磁盘上每隔一个磁盘块都被分配。这是一个测试块分配策略的好测试。磁盘碎片整理器有许多选项来指定其创建的层次结构的深度、每个目录的文件数、创建的文件大小范围以及每个文件写入的数据量（随机或固定）。改变参数提供了各种 I/O 模式。
- **文件混淆程序 (Muck files)**：创建一个目录层次结构作为工作空间，并生成多个线程来创建、重命名、写入和删除文件。这些线程将在目录层次结构中向上和向下移动，随机操作文件。与磁盘碎片整理器一样，每个目录的文件数、文件大小等都是可配置参数。这个测试是人工老化文件系统的好方法。
- **大文件测试 (Big file)**：将随机或固定大小的块写入文件，使其增长直到磁盘填满。这模拟了追加到日志文件和向磁盘流式传输大量数据，具体取决于块大小。这个测试对数据流操作例程施加了压力，因为它是唯一能够可靠地写入足够大以需要双间接块的文件的测试。大文件测试还将用户指定模式写入文件，这使得检测文件损坏更容易（如果 i-node 中出现模式 0xbf，那么发生的情况就很明显了）。这个测试支持每次写入的可配置块大小，这有助于测试长时间向文件零星写入数据与尽快向磁盘大量写入数据。
- **新闻测试 (News test)**：是对互联网新闻服务器行为的模拟。互联网新闻系统对文件系统而言是出了名的压力大，因此一个模拟新闻服务器效果的合成程序是一个有用的测试。新闻测试在性质上类似于文件混淆测试，但更侧重于新闻服务器所做的活动类型。可配置数量的写入线程在大型层次结构中的随机位置创建文件。为了删除文件，可配置数量的删除线程删除早于给定时间的文件。这个测试经常暴露文件系统中的竞争条件。
- **重命名测试 (Rename test)**：是一个简单的 shell 脚本，它创建一个最初都名为 `aa` 的目录层次结构。在每个目录中运行另一个脚本，将子目录从 `aa` 重命名为 `zz`，然后再回到 `aa`。这可能看起来是一个微不足道的测试，但在 BeOS 这样一个会发送重命名等更新通知的系统中，这个测试产生了大量的流量。此外，当与其它测试结合运行时，它还暴露了在获取文件系统数据结构访问权限方面的几个竞争条件。
- **随机 I/O 测试 (Random I/O test)**：旨在锻炼数据流结构以及 I/O 系统的其余部分。其背后的动机是大多数程序执行固定块大小的简单顺序 I/O，因此并非所有可能的对齐和边界情况都得到了充分的测试。随机 I/O 测试的目标是测试文件系统如何处理那些会寻找到文件中随机位置，然后在文件中该位置执行随机大小 I/O 的程序。这测试了诸如读取文件中间接块中最后一个块的最后一部分，然后读取少量第一个双间接块的情况。为了验证读取的正确性，文件以一系列递增整数的形式写入，其值与种子值进行异或运算。这会生成有趣的数据模式（即它们易于识别），并且只需知道其偏移量和种子值，即可轻松验证文件中任何部分的数据。这对于找出数据流代码中的错误证明是无价的，这些错误只有在读取文件位置不在块边界上且长度不是文件系统块大小的倍数的数据块时才会出现。为了正确地对文件系统施加压力，有必要在运行磁盘碎片整理器之后运行随机 I/O 测试或与其它测试结合运行。

除了上述测试集之外，还编写了一些较小的测试来检查文件系统中的其他**边缘条件**。创建大文件名、超出最大允许路径名长度的层次结构以及不断向文件添加属性直到没有更多磁盘空间的测试，都以各种方式对系统施加压力以发现其局限性。找出边缘条件的测试是必要的，因为即使可能有明确的文件名长度限制（BFS 中为 255 字节），系统中的一个细微错误也可能导致其无法工作。

尽管 BFS 没有这样做，但使用**文件系统跟踪**来模拟磁盘活动是另一种测试可能性。捕获活动系统的 I/O 事件日志，然后重放活动，介于真实世界测试和合成测试之间。重放跟踪可能无法复制生成跟踪时存在的所有因素。例如，内存使用可能不同，这可能会影响缓存的内容和未缓存的内容。文件系统跟踪的另一个困难是，尽管磁盘活动是真实的，但它只是所有可能的磁盘活动顺序中的一个数据点。如果使用跟踪回放来测试文件系统，则使用在不同场景下捕获的各种跟踪非常重要。

### 真实世界测试 (Real-World Tests)

真实世界测试就是**真实用户运行并执行真实工作的程序**。以下任务很常见并产生大量有用的文件系统活动：

- 处理完整的互联网新闻提要
- 复制大型层次结构
- 归档大型文件层次结构
- 解压大型归档文件
- 压缩文件
- 编译源代码
- 将音频和/或视频捕获到磁盘
- 同时读取多个媒体流

在这些测试中，**处理互联网新闻提要**是迄今为止压力最大的。完整的互联网新闻提要的流量大约是**每天 2 GB**，分布在几十万条消息中（1998 年初）。INN 软件包将每条消息存储在单独的文件中，并使用文件系统层次结构来管理新闻层次结构。除了大量文件之外，新闻系统还使用存储在文件中的几个大型数据库，其中包含新闻系统中所有活动文章的概览和历史信息。活动的数量、文件的大小以及所涉及的文件的数量使运行 INN 成为文件系统所能承受的最残酷的测试。

运行 INN 软件并接受完整的新闻提要是一项艰巨的任务。不幸的是，INN 软件尚未在 BeOS 上运行，因此无法进行此测试（因此创建了合成新闻测试程序）。一个能够支持真实 INN 软件并且能够不损坏磁盘的文件系统是一个真正成熟的文件系统。

列表中的其他测试具有不同程度和风格的磁盘活动。大多数测试都很容易组织，并可以通过 shell 脚本在循环中执行。为了测试 BFS，我们创建并提取了 BeOS 安装包的存档，压缩了 BeOS 安装包的存档，编译了整个 BeOS 源代码树，将视频流捕获到磁盘，并播放了多轨音频文件以进行实时混音。为了改变测试，存档测试使用了不同的源代码存档。此外，我们经常同时运行合成测试和真实世界测试。多样性对于确保尽可能多地测试磁盘 I/O 模式非常重要。

### 最终用户测试 (End User Testing)

另一个重要但难以量化的组成部分是**最终用户黑盒测试**。BFS 的最终用户测试包括让一个狂热的测试人员在系统上自由发挥，尝试通过一切可能的方式（除了编写程序直接写入硬盘设备）损坏硬盘。这种测试通常侧重于使用图形用户界面手动操作文件。这种测试的手动性质使其难以量化和重现。然而，我发现这种测试对于生产可靠系统来说是**无价的**。尽管难以重现事件的确切序列，但一个彻底而勤奋的测试人员可以提供足够的细节来拼凑出导致崩溃的事件。幸运的是，在测试 BFS 时，我们的最终用户测试人员非常狡猾，发现了无数巧妙的方法来破坏文件系统。令人惊讶的是，发现的大多数错误都发生在**经验丰富的 Unix 老手永远不会想到做的操作**中。例如，有一次我看到我们的首席测试人员开始复制一个大型文件层次结构，同时在创建它的过程中开始归档它，同时将归档文件切割成许多小文件。这位特定的测试人员发现了运行标准 Unix 工具（如 `cp`、`mv`、`tar` 和 `chop`）的无数种组合方式，这些工具除了发现文件系统错误之外不会执行任何有用的工作。一个聪明且能够可靠地描述导致崩溃的操作的良好测试团队，对于文件系统的验证来说是一个巨大的福音。如果不是这种类型的测试，BFS 不会像今天这样健壮。

## 12.6 测试方法论 (Testing Methodology)

为了正确测试文件系统，需要一个**连贯的测试计划**。详细的测试计划文档不是必需的，但是除非对流程进行一些思考，否则它很可能退化为一种随机的霰弹枪式方法，导致覆盖范围零散。通过描述 BFS 所经历的测试，我希望提供一个实用的测试指南。这绝不是唯一的方法，也未必是最好的方法——它只是导致一个稳定、可发货的文件系统的方法，而这个文件系统在最初编码开始后不到一年就问世了。

BFS 的实现始于一个**用户级程序**，带有一个**测试工具**，允许编写简单的测试。当时没有人使用这个文件系统，测试包括进行更改并运行测试程序，直到我对更改感到自信。在这个阶段使用了两个主要程序。第一个程序是一个**交互式 shell**，通过简单的命令为大多数文件系统功能提供前端。其中一些命令是基本的文件系统原语：创建、删除、重命名、读取和写入。其他命令提供了封装底层原语的更高级测试。第二个测试程序是一个**专门的测试**，会随机创建和删除文件。这个程序会检查其运行结果以保证其正确运行。这两个程序结合起来构成了前几个月的开发工作。

此外，还有其他**重要数据结构的测试工具**，以便它们可以隔离测试。块位图分配器和 B+树代码都有单独的测试工具，可以轻松地与文件系统的其余部分分开进行测试。对 B+树代码所做的更改通常会经历几天**连续的随机测试**，这些测试会插入和删除数亿个键。这比仅仅测试整个文件系统产生了更好的整体测试系统。

在开发的前三个月之后，有必要让其他人使用 BFS，因此 BFS 升级为内核空间的全职成员。在这个阶段，尽管功能还远未完善，但 BFS 已经具备了足够的功能，可以用作传统风格的文件系统。正如预期的那样，文件系统从我自己的测试中看似稳定的水平，在允许其他人使用后，立即出现了大量毁灭性的错误。由于测试人员的即时反馈，文件系统通常每天都会有三到四个修复。经过几周的持续改进和与测试团队的密切合作，文件系统达到了一个里程碑：现在其他工程师可以放心地使用它来开发操作系统的其他部分，而不用立即担心数据损坏。

在这个阶段，测试团队仍然可以破坏文件系统，但这需要**相当大的努力**（即超过 15 分钟）。权衡修复错误和实现新功能的需求是一个艰难的选择。随着所需功能的滞后，它们的重要性越来越大，直到它们超过了已知错误的优先级，工作不得不转移到实现新功能而不是修复错误。然后，随着功能的完成，工作又转回修复错误。这个过程**多次迭代**。

在此期间，测试团队忙于实现上述测试。有时会有多个版本的测试，因为 BeOS 上有两个文件系统 API（传统的 POSIX 风格 API 和面向对象的 C++ API）。我鼓励不同的测试人员编写类似的测试，因为我认为让文件系统尽可能多地接触不同的 I/O 方法会很好。

测试中的另一个复杂性是**尽可能多地安排 I/O 配置**。为了暴露竞争条件，测试**快速 CPU 搭配慢速硬盘**、**慢速 CPU 搭配快速硬盘**以及**正常组合**（快速 CPU 和快速硬盘）都很有用。还构建了多 CPU 机器和不同内存配置的其他安排。总体动机是，竞争条件通常取决于处理器和磁盘速度、完成了多少 I/O（受系统中内存量的影响）以及系统中有多少 CPU 之间**模糊的关系**。构建如此多样化的测试配置是困难但必要的。

在**磁盘空间不足**的条件下测试文件系统被证明是所有任务中最困难的。磁盘空间不足是微不足道的，但在所有可能的代码路径中遇到错误则相当困难。我们发现 BFS 需要在磁盘空间非常低的情况下运行**长时间的重度压力测试**（数小时），以尝试探索尽可能多的代码路径。在实践中，有些错误只有在同时运行三四个合成测试**连续 16 小时或更长时间**后才会浮出水面。教训是，简单地触及限制可能不足以进行充分测试。可能需要**连续数天**正面冲击限制，才能彻底清除所有可能的错误。

在 BFS 首次发布之前，系统已经稳定到硬盘损坏需要**相当大的努力**，并且所有真实世界测试都能**连续 24 小时或更长时间**无损坏地运行。在首次客户发货时，文件系统有一个已知问题，我们无法确定，但它只会在**极少数情况下**发生。到第二次发布（两个月后），又修复了几个错误，第三次发布（再两个月后）时，文件系统能够承受**数天的严重滥用**。这并不是说文件系统中没有错误。即使现在偶尔也会出现一个模糊的错误，但截至目前（文件系统最初开发后大约 16 个月），错误并不常见，并且系统普遍被认为是健壮和稳定的。更重要的是，**损坏的文件系统\**\**令人欣慰地很少见**；浮出水面的错误通常只是调试检查，当它们检测到数据结构不一致时（在将其写入磁盘之前）就会停止系统。

## 12.7 总结 (Summary)

本章的真正教训不是 BFS 开发中进行的具体测试，而是**尽早且经常进行测试**是保证文件系统健壮性的最可靠方法。将文件系统投入到一个狂热的测试团队的巨大口中是**唯一能发现系统问题的方法**。平衡实现功能的需求与拥有稳定基础的需求是困难的。BFS 的开发表明，在功能和错误修复之间**迭代**效果很好。在错误修复阶段，对错误的快速响应以及测试和开发团队之间的良好沟通确保系统能够**快速成熟**。测试各种 CPU、内存和 I/O 配置有助于使系统接触尽可能多的 I/O 模式。

没有什么能保证文件系统的正确性。获得文件系统信心的唯一方法是**对其进行测试，直到它能够经受住测试环境所能提供的最严酷的打击**。也许衡量文件系统质量的最佳指标是，文件系统的作者是否愿意将自己的数据存储在他们的文件系统上，并将其用于日常使用。
