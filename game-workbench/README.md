# 畸变前线 · 制作工作台

版本资料、资产索引与 Blender 制作通路的本地中间层。支持 Blender / GLB / FBX，暂不绑定特定游戏引擎。

## 启动

双击工作区根目录的 **启动制作工作台.cmd**，浏览器打开 <http://127.0.0.1:4180>。

也可以进入本目录运行 `node server.mjs`。需要 Node.js 22 或更高版本；无需 `npm install`。双击启动器会隐藏后台服务窗口，重复启动会复用已有服务。

## 已有内容

- V1、V2、V3：按各自 README 整理简介、功能与边界，保留原始构建入口；可编辑档案和新建规划版本。
- 资产：索引 `../output`、根目录游戏预览图及本目录 `library`。保留中文路径和稳定 ID，不搬走原始文件。包括角色三视图、动作参考、透明立绘、图标、场景、其他参考素材与说明文档。
- 五角色、十五技能：沿用原始 JSON 中的角色设定；明确是美术与技能方案，不表示已实现新技能。
- 30 项初始任务：每个角色的建模、绑骨、3 个技能动画、导出交付；全部初始为待制作。可新增、编辑、设置依赖、关联交付文件。
- 资产导入、筛选、标签、备注、版本关联；制作记录持久保存；可下载版本清单与完整索引备份。
- 未压缩、自包含 GLB 的三维预览、旋转缩放、动作播放、骨架和线框检查。FBX / Blend 在 Blender 中编辑。

新建版本档案只创建资料，不生成新游戏构建。GLB/FBX 导出入库不等于已替换现有游戏的程序化角色。

工作台的游戏入口使用 4180 端口；V1 / V2 / V3 使用各自不同的存档键。浏览器按来源隔离存储，因此旧 4173–4175 端口、离线 HTML 与线上站点的历史存档仍留在原入口，不会自动迁移到工作台。

## 后续文件放置

```text
library/
  models/       模型与 .blend 源文件
  rigs/         绑定后的源文件
  animations/   动画工程、动作文件
  exports/      Blender 导出的 GLB / FBX
  references/   导入的新参考图与资料
```

网页导入上限为单文件 256 MB；更大的文件可直接放入 `library` 后点击“同步资产”。带外部贴图与 .bin 的 glTF 应保持原有相对目录，通过文件夹放入 library；网页单文件预览优先使用 GLB。导入会复制文件，同名文件加唯一前缀，不覆盖原文件。索引包含文件存在性和元数据，不进行所有格式的内容完整性检验。

记录保存在 `data/catalog.json`，每次写入通过临时文件原子替换，前一版留在 `catalog.json.bak`。自动扫描会保留手动标签、备注和版本关联。文件改名被视为新资产。备份索引不包含原始素材二进制；完整迁移需要一起复制原有项目目录与工作台。

## Blender 与 MCP

项目准备了两部分：

1. `integrations/blender/addon.py`：社区 [MCP for Blender](https://github.com/ahujasid/mcp-for-blender) 的固定提交源码；MIT 许可证和提交 / SHA256 记录一起保存。上游项目原名 blender-mcp。该插件是社区项目，不是 Blender 官方组件。
2. `mcp.mjs`：本项目的 Node.js MCP stdio 适配器。资产和任务调用本地 HTTP 服务；Blender 命令与社区插件的 JSON socket 协议兼容，不需要 uv 或 Python MCP 运行环境。

在 Blender 的偏好设置中从磁盘安装 `addon.py`，启用 MCP for Blender。3D 视图按 N，在插件面板确认服务器使用本机 9876 端口。保持 Blender 开启，再点击工作台“检测连接”。插件连接成功才可执行场景操作。

运行 `powershell -NoProfile -ExecutionPolicy Bypass -File .\register-mcp.ps1` 可向 Codex 注册 `frontier-studio`。该脚本调用 `codex mcp add`，不改写其他 MCP 项目。重新打开会话以加载新工具。连接器需要时会自动启动 4180 端口的工作台。

可用 MCP 工具：

| 工具 | 用途 |
| --- | --- |
| project_overview / list_versions | 项目、角色与版本背景 |
| list_assets / update_asset / rescan_assets | 资产查询、标注、重新扫描 |
| list_tasks / create_task / update_task | 制作任务与验收记录 |
| version_manifest | 指定版本的交付索引 |
| blender_scene | 连接状态与场景信息 |
| blender_audit | 网格、UV、缩放、骨架、权重、动作检查 |
| blender_reference | 将已收录图片添加为参考对象 |
| blender_export | 选中对象导出 GLB / FBX 并收录 |
| blender_execute_python | 按具体任务执行 Blender Python，修改模型、材质、绑定、动画 |

示例任务：“读取烬刃三视图与角色设定，把参考图加入 Blender，检查现有模型；先保存工作副本，再调整比例，提交检查报告和 GLB，更新建模任务。”

网页只提供固定参考图导入、只读检查与导出。任意 Python 仅通过 MCP 执行，会修改 Blender 当前场景；应在明确的制作任务中使用，并保留 .blend 副本。模型生成外部服务（如 Meshy、Tripo）未启用或配置付费密钥。

### 检查与交付规范

- 建议单位：米；绑定前统一比例与旋转，已绑定模型不要盲目应用变换。
- 骨架：root / pelvis 分离，左右统一 `.L` / `.R`，角色特有骨骼保留独立命名。
- 动画：按 `角色_动作_变体` 命名；建议 30 FPS，逐片记录根运动或原地运动；导出前检查动作范围与循环。
- 导出：同时选中网格与骨架；GLB 保留动画，FBX 不追加叶骨并启用动画烘焙。
- 只读报告基于原始网格；不是完整的非流形检测、修改器最终面数、变形穿插或引擎性能验收。报告写入 `data/blender-audit.json`。

## 开发与接口

纯 Node HTTP + 本地 JSON，前端为原生模块；Three.js r170 与加载器随项目附带许可证，不依赖 CDN。

`npm test` 运行持久化、依赖、HTTP、路径边界、Blender socket 与 MCP 协议测试。测试使用临时目录与模拟 Blender 服务，不需要启动 Blender。

主要接口：`GET /api/catalog`、`POST /api/scan`、`POST /api/import?name=...`、`PATCH /api/assets/:id`、`PUT /api/versions/:id`、`POST /api/tasks`、`PATCH /api/tasks/:id`、`GET /api/manifest?version=v3`、`GET /api/blender/status`、`POST /api/blender/audit`、`POST /api/blender/reference`、`POST /api/blender/export`。

写入要求 `X-Workbench-Request: 1`，浏览器 Origin 必须同源。服务只监听 127.0.0.1；拒绝非本机 Host；文件读取限制在索引或明确构建目录中。导入的 HTML 不执行，预览文档与 SVG 使用 sandbox CSP。适用于本机个人制作，不是公网多用户服务。

未来可扩展：引擎导入适配器、动作重定向配方、LOD 批处理、材质打包、角色骨架模板、Git LFS 版本管理。扩展时保持资产 ID、相对路径、版本与交付任务之间的关联。

## 回响远征的天赋与战斗特效

侧栏「天赋与特效」可按武器、按键、稀有度或天赋 ID 检索。展开条目可查看触发条件、升阶表现、实现入口，并点击关联项反查。页面也链接实机对照图与动作预览。

特效源码在 `library/echo-effects/`。游戏从这里打包通用反馈、武器招式、角色技能和天赋触发效果。`studies.js` 定义天赋、稀有度、按键和技能关联，`handling.mjs` 记录每种形态的美术处理。战斗判定与伤害结算入口在游戏的 `src/`。修改后在游戏目录运行 `npm run build:rogue`，同步生成离线游戏、工作台索引和[天赋与特效手册](library/echo-effects/天赋与特效手册.md)。
