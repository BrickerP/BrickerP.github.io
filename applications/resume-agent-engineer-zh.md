# 卢昱鹏 · Yupeng Lu

**AI Agent / 后端工程师**

[yplmicro@gmail.com](mailto:yplmicro@gmail.com) · [GitHub](https://github.com/BrickerP) · [LinkedIn](https://www.linkedin.com/in/yupeng-lu-845a0b411/)

使用 TypeScript/Node.js、Python 和 Java 开发生产系统。工作覆盖 Agent 工具调用与流式执行、实时语音、计费系统、自动化测试和云上故障处理。

## 工作经历

### 百度 · 软件工程师，MeDo

2026.07 — 至今 · 北京

MeDo 是通过 AI 生成、部署和托管应用的平台。负责海外计费及相关后端系统，参与平台运行维护和版本交付。

- 主导海外计费服务与数据库拆分，梳理订阅、订单、额度账本和支付事件的服务边界，制定数据迁移、切流及回滚方案，负责上线核对。
- 参与 Supabase 托管后端的方案设计与跨服务联调，覆盖 Agent 工具接入、数据库结构变更、函数部署和开发/生产环境隔离，并对接实例启停恢复、资源配额及计费。
- 处理付款后权益未到账、已取消订阅被迟到事件恢复等问题；完善事件幂等、订阅终态校验和失败重试，防止重复发放或错误恢复权益。
- 排查恶意账号利用代码执行沙箱运行挖矿程序引发的集群故障，结合节点状态、进程和资源配置定位 CPU 超卖，处置异常负载并恢复可用容量。
- 为计费迁移建立数据核对和异常场景验收，以约 675 万条历史账本流水为生产数据基线；从用户下单、支付回调到数据库入账逐段验证，补充欠款、额度过期和周期发放等边界场景。

### Cookiy AI · AI Agent 工程师

2025.08 — 2026.07 · 硅谷总部 / 北京研发团队

面向用户研究的 AI 访谈平台，覆盖访谈执行、研究分析和报告生成。

- 开发研究与报告对话 Agent，按任务限定可调用工具，编辑前加载已有报告和访谈证据；将报告生成拆为分批分析、综合与校验，约束后续修改中的事实漂移。
- 负责 MCP 工具和公开 API，统一参数校验、鉴权、分页与任务状态，支持研究创建、访谈、回放和报告等流程；开发 TypeScript CLI，供外部 Agent 调用。
- 完善 SSE、WebSocket 和 MCP 长任务的心跳、超时、取消及资源清理，传递运行标识，定位流式连接中断和模型接口异常。
- 建立覆盖网页与 CLI/MCP 的端到端测试，检查真实调用结果、生成内容与耗时，保留日志及运行记录；将流式边界和生产故障纳入回归及发布检查。
- 开发实时语音访谈与报告问答，接入 LiveKit、语音识别和流式 TTS，支持用户打断与追问切换，处理识别、模型响应和播报之间的时序。

### SMU · 软件工程师

2024.02 — 2026.01 · 洛杉矶

- 使用 Python AsyncIO 构建 Amazon、Shopify 与 ERP 间的订单及库存同步，结合 Redis、Kafka 和批量数据库操作处理异步数据流。
- 独立开发并运营 GetDateLove，完成 FastAPI/PostgreSQL 后端、WebSocket 消息、支付与 AWS 部署，建立 Playwright 端到端测试和 CI 发布检查。

### 华为 · 软件工程师，SPU 开发

2023.04 — 2024.02 · 北京

- 使用 C/C++ 开发 NE40E 路由器流量统计与 NetStream 功能，排查报文处理、流日志、URL 解析和 HTTP 头处理问题。

## 项目经历

### 实盘交易系统 · 联合开发

2026.04 — 至今 · 并行项目

- 开发 Python 实盘执行系统，通过成交去重、持久化执行账本和启动时券商对账，处理重启、重复事件与本地状态不一致。
- 排查定时回填与实时扫描争用 SQLite 写锁造成的延迟回退；维护 AWS 部署、运行监控和研究看板，使用 SSM 管理访问与密钥。

## 技术能力

- **语言与后端：** TypeScript/Node.js、Python（AsyncIO、FastAPI）、Java/Spring Boot、C/C++。
- **Agent 与实时系统：** MCP、工具调用与上下文约束、OpenAI/Gemini 接入、SSE/WebSocket、LiveKit。
- **数据与基础设施：** MySQL、PostgreSQL、Redis、SQLite、Kafka；Linux、Docker、Kubernetes、AWS。
- **测试与排障：** Playwright、API/CLI 端到端测试、CI/CD、日志关联、性能分析与生产数据核对。

## 教育背景

**波士顿大学** · 数学金融与金融科技硕士 · GPA 3.78

**俄亥俄州立大学** · 物理学学士 · GPA 3.84

## 公开作品

[Cookiy TypeScript CLI](https://github.com/cookiy-ai/cookiy-cli) · [用户研究 Agent 集成](https://github.com/cookiy-ai/user-research-skill)
