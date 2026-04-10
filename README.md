# FileShare - 文件分享应用

一个简洁的文件分享服务，支持通过二维码快速分享文件，文件将在1小时后自动删除。

## 功能特性

- **拖拽上传**: 支持拖拽文件到上传区域
- **点击上传**: 点击上传区域选择文件
- **二维码生成**: 上传后自动生成下载二维码
- **链接复制**: 一键复制下载链接
- **自动清理**: 文件1小时后自动删除，保护隐私
- **响应式设计**: 适配桌面和移动设备

## 代码结构

```
fileshare/
├── server.js          # Express 服务端核心逻辑
├── public/
│   └── index.html     # 前端页面（HTML + CSS + JS）
├── uploads/           # 文件存储目录
├── package.json       # 项目配置
└── README.md          # 项目文档
```

### 核心模块

| 文件 | 说明 |
|------|------|
| `server.js` | Express 服务器，处理文件上传、QR码生成、定时清理 |
| `public/index.html` | 单页应用，包含完整的前端交互逻辑 |

## 设计思路

### 1. 架构设计

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   浏览器    │────▶│  Express    │────▶│   磁盘      │
│  (上传/下载)│◀────│  Server     │◀────│   存储      │
└─────────────┘     └─────────────┘     └─────────────┘
                           │
                    生成 QR Code
```

### 2. 关键技术

- **Express**: 轻量级 Node.js Web 框架
- **Multer**: 文件上传中间件
- **QRCode**: 生成二维码（DataURL 格式）
- **UUID**: 为每个文件生成唯一标识
- **node-cron**: 定时任务，清理过期文件

### 3. 安全设计

- 文件名使用 UUID 随机命名，不暴露原始文件名
- 文件存储在服务端隔离目录
- 访问需提供文件 ID，无 ID 无法访问
- 定时清理机制，防止文件无限累积

## API 接口

### 上传文件
```
POST /api/upload
Content-Type: multipart/form-data

Response:
{
  "success": true,
  "fileId": "uuid",
  "originalName": "filename.txt",
  "size": "1.5 MB",
  "downloadUrl": "http://.../download/uuid",
  "qrCode": "data:image/png;base64,...",
  "expiresIn": "1 hour(s)"
}
```

### 下载文件
```
GET /download/:fileId
```

## 使用方法

### 安装依赖

```bash
npm install
```

### 启动服务

```bash
# 开发模式
npm run dev

# 生产模式
npm start
```

服务默认运行在 `http://localhost:3000`

### Docker 部署

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 3000
CMD ["node", "server.js"]
```

```bash
docker build -t fileshare .
docker run -p 3000:3000 fileshare
```

## 配置说明

可在 `server.js` 中修改以下配置：

| 配置项 | 默认值 | 说明 |
|--------|--------|------|
| `PORT` | 3000 | 服务端口 |
| `FILE_EXPIRY_HOURS` | 1 | 文件过期时间（小时） |
| 文件大小限制 | 100MB | 在 multer 配置中修改 |

## 依赖版本

```json
{
  "express": "^4.18.2",
  "multer": "^1.4.5-lts.1",
  "qrcode": "^1.5.3",
  "uuid": "^9.0.0",
  "node-cron": "^3.0.3"
}
```

## 许可证

MIT License
