# Practical File System Design 中文翻译

## 简介

《Practical File System Design with the Be File System》是一本深入探讨文件系统设计原则与实践的经典著作。本项目旨在提供该书的中文翻译，帮助中文读者更好地理解和学习文件系统设计。

### 目标读者

- 计算机科学研究人员
- 文件系统开发者
- 对系统设计感兴趣的工程师

## 目录结构

```bash
practical-file-system-design-translation/
├── app/              # Next.js 应用目录
│   ├── globals.css   # 全局样式
│   ├── layout.tsx    # 根布局组件
│   ├── page.tsx      # 首页组件
│   └── chapters/     # 章节页面
│       └── [slug]/   # 动态路由
├── content/          # 内容目录
│   ├── chapters/     # 翻译章节
│   │   ├── chapter1.md
│   │   └── chapter2.md
│   └── references/   # 参考资料
│       └── bibliography.md
├── lib/             # 工具库
│   └── api.ts       # API 函数
├── public/          # 静态资源目录
│   ├── *.svg        # 图标资源
│   └── fonts/       # 字体文件
├── LICENSE          # 许可证
├── README.md        # 项目说明
├── next.config.js   # Next.js 配置
├── tailwind.config.ts # Tailwind 配置
└── tsconfig.json    # TypeScript 配置
```

## 内容目录

1. [第一章：BeOS 和 BFS 简介](content/chapters/chapter1.md)
   - [1.1 BFS 的历史背景](content/chapters/chapter1.md#11-history-leading-up-to-bfs)
   - [1.2 设计目标](content/chapters/chapter1.md#12-设计目标)
   - [1.3 设计约束](content/chapters/chapter1.md#13-设计约束)
   - [1.4 小结](content/chapters/chapter1.md#14-小结)
2. [第二章：什么是文件系统？](content/chapters/chapter2.md)
   - [2.1 基础知识](content/chapters/chapter2.md#21-基础知识)
   - [2.2 术语](content/chapters/chapter2.md#22-术语)
   - [2.3 抽象](content/chapters/chapter2.md#23-抽象概念)
   - [2.4 基本文件系统操作](content/chapters/chapter2.md#24-基本文件系统操作basic-file-system-operations)
   - [2.5 扩展文件系统操作](content/chapters/chapter2.md#25-扩展文件系统操作extended-file-system-operations)
   - [2.6 小结](content/chapters/chapter2.md#26-小结summary)
3. [第三章：其他文件系统](content/chapters/chapter3.md)
   - [3.1 BSD FFS](content/chapters/chapter3.md#31-bsd-ffs)
   - [3.2 Linux ext2](content/chapters/chapter3.md#32-linux-ext2)
   - [3.3 Macintosh HFS](content/chapters/chapter3.md#33-macintosh-hfs)
   - [3.4 Irix XFS](content/chapters/chapter3.md#34-irix-xfs)
   - [3.5 Windows NT 的 NTFS](content/chapters/chapter3.md#35-windows-nt-的-ntfs)
   - [3.6 小结](content/chapters/chapter3.md#36-小结)
4. [第四章：BFS 的数据结构](content/chapters/chapter4.md)
   - [4.1 什么是磁盘？](content/chapters/chapter4.md#41-什么是磁盘)
   - [4.2 如何管理磁盘块](content/chapters/chapter4.md#42-如何管理磁盘块)
   - [4.3 分配组](content/chapters/chapter4.md#43-分配组allocation-groups)
   - [4.4 块运行](content/chapters/chapter4.md#44-块运行block-runs)
   - [4.5 超级块](content/chapters/chapter4.md#45-超级块-superblock)
   - [4.6 I-Node 结构](content/chapters/chapter4.md#46-i-node-结构-the-i-node-structure)
   - [4.7 I-Node 的核心：数据流](content/chapters/chapter4.md#47-i-node-的核心数据流-the-core-of-an-i-node-the-data-stream)
   - [4.8 属性](content/chapters/chapter4.md#48-属性-attributes)
   - [4.9 目录](content/chapters/chapter4.md#49-目录-directories)
   - [4.10 索引](content/chapters/chapter4.md#410-索引-indexing)
   - [4.11 小结](content/chapters/chapter4.md#411-总结-summary)
5. [第五章：属性、索引和查询](content/chapters/chapter5.md)
   - 5.1 属性
   - 5.2 索引
   - 5.3 查询
   - 5.4 小结
6. [第六章：分配策略](content/chapters/chapter6.md)
   - 6.1 磁盘上的数据布局
   - 6.2 什么是分配策略？
   - 6.3 物理磁盘
   - 6.4 可布局的内容
   - 6.5 访问类型
   - 6.6 BFS 中的分配策略
   - 6.7 小结
7. [第七章：日志](content/chapters/chapter7.md)
   - 7.1 基础知识
   - 7.2 日志如何工作
   - 7.3 日志的类型
   - 7.4 日志的内容
   - 7.5 超越日志
   - 7.6 成本分析
   - 7.7 BFS 的日志实现
   - 7.8 深入了解事务
   - 7.9 小结
8. [第八章：磁盘块缓存](content/chapters/chapter8.md)
   - 8.1 背景
   - 8.2 缓存的组织
   - 8.3 缓存优化
   - 8.4 I/O 与缓存
   - 8.5 小结
9. [第九章：文件系统性能](content/chapters/chapter9.md)
   - 9.1 什么是性能？
   - 9.2 性能基准
   - 9.3 性能数据
   - 9.4 BFS 的性能
   - 9.5 小结
10. [第十章：Vnode 层](content/chapters/chapter10.md)
    - 10.1 背景
    - 10.2 Vnode 层的概念
    - 10.3 Vnode 层支持例程
    - 10.4 实际工作原理
    - 10.5 节点监视器
    - 10.6 实时查询
    - 10.7 小结
11. [第十一章：用户级 API](content/chapters/chapter11.md)
    - 11.1 POSIX API 和 C 扩展
    - 11.2 C++ API
    - 11.3 使用 API
    - 11.4 小结
12. [第十二章：测试](content/chapters/chapter12.md)
    - 12.1 支持工具
    - 12.2 数据结构验证示例
    - 12.3 调试工具
    - 12.4 为调试设计的数据结构
    - 12.5 测试类型
    - 12.6 测试方法
    - 12.7 小结

附录：[文件系统构建工具包](content/chapters/appendix.md)

- A.1 简介
- A.2 概述
- A.3 数据结构
- A.4 API

参考文献：[书籍参考文献](references/bibliography.md)

## 在线阅读

访问我们的在线文档：[Practical File System Design 中文翻译](https://practical-file-system-design.vercel.app)

## 本地开发

### 1. 获取项目

```bash
git clone https://github.com/BruceBlink/practical-file-system-design-translation.git
cd practical-file-system-design-translation
```

### 2. 安装依赖

```bash
npm install
```

### 3. 启动开发服务器

```bash
npm run dev
```

现在你可以在 `http://localhost:3000` 访问本地开发版本。

### 4. 构建生产版本

```bash
npm run build
npm run start
```

### 5. 文档结构

- 访问 `content/chapters/` 目录查看已翻译的章节内容
- 在 `references/bibliography.md` 中查找相关参考资料
- 参考 `LICENSE` 了解使用条款

## 翻译进度

- [x] 第一章：BeOS 和 BFS 简介
- [x] 第二章：什么是文件系统？
- [x] 第三章：其他文件系统
- [x] 第四章：BFS 的数据结构
- [x] 第五章：属性、索引和查询
- [x] 第六章：分配策略
- [x] 第七章：日志
- [x] 第八章：磁盘块缓存
- [ ] 第九章：文件系统性能
- [ ] 第十章：Vnode 层
- [ ] 第十一章：用户级 API
- [ ] 第十二章：测试

## 技术栈

- **框架**: [Next.js 14](https://nextjs.org/)
- **样式**: [Tailwind CSS](https://tailwindcss.com/)
- **部署**: [Vercel](https://vercel.com)
- **内容**: Markdown

## 参与贡献

我们欢迎各种形式的贡献，包括但不限于：

- 翻译新的章节
- 校对已翻译的内容
- 改进项目文档
- 报告问题或提出建议

### 贡献方式

1. Fork 本项目
2. 创建你的特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交你的更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 创建一个 Pull Request

## 许可证

本项目采用 [LICENSE 文件中指定的许可证] 进行许可。

## 项目状态

![部署状态](https://img.shields.io/github/deployments/BruceBlink/practical-file-system-design-translation/Production?label=vercel&logo=vercel)
![上次提交](https://img.shields.io/github/last-commit/BruceBlink/practical-file-system-design-translation)
![翻译进度](https://img.shields.io/badge/翻译进度-67%25-green)
![维护状态](https://img.shields.io/badge/维护状态-积极维护-brightgreen)
![许可证](https://img.shields.io/github/license/BruceBlink/practical-file-system-design-translation)

## 联系方式

- 项目维护者：[邮箱](mailto:likanug.g@qq.com)
- 项目仓库：[GitHub](https://github.com/BruceBlink/practical-file-system-design-translation)
- 问题反馈：[Issues](https://github.com/BruceBlink/practical-file-system-design-translation/issues)
- 在线文档：[Vercel](https://practical-file-system-design.vercel.app)
