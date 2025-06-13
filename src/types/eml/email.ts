// EML邮件管理系统 - 邮件相关类型定义

/** 邮件消息实体 */
export interface EmailMessage {
  /** 主键ID */
  id: number
  /** 邮件ID (Message-ID) */
  messageId: string
  /** 邮件主题 */
  subject: string
  /** 发件人 */
  sender: string
  /** 收件人列表 */
  recipients: string[]
  /** 抄送人列表 */
  ccRecipients?: string[]
  /** 密送人列表 */
  bccRecipients?: string[]
  /** 发送时间 */
  sendDate: string
  /** 接收时间 */
  receivedDate: string
  /** 纯文本正文 */
  bodyText?: string
  /** HTML正文 */
  bodyHtml?: string
  /** 邮件内容（用于显示） */
  contentText?: string
  /** HTML内容（用于显示） */
  contentHtml?: string
  /** 原始文件路径 */
  originalPath: string
  /** 是否标记星标 */
  isStarred: boolean
  /** 附件数量 */
  attachmentCount: number
  /** 导入批次ID */
  importBatchId: number
  /** 创建时间 */
  createTime: string
  /** 附件列表 */
  attachments?: EmailAttachment[]
}

/** 邮件附件实体 */
export interface EmailAttachment {
  /** 附件ID */
  id: number
  /** 邮件ID */
  emailId: number
  /** 文件名 */
  filename: string
  /** 文件名（原始） */
  fileName: string
  /** 内容类型 */
  contentType: string
  /** 文件大小（字节） */
  fileSize: number
  /** MinIO存储路径 */
  minioPath: string
  /** 下载链接 */
  downloadUrl: string
}

/** 邮件列表查询参数 */
export interface EmailQueryParams {
  /** 页码 */
  pageNo?: number
  /** 每页大小 */
  pageSize?: number
  /** 邮件主题 */
  subject?: string
  /** 发件人 */
  sender?: string
  /** 收件人 */
  recipient?: string
  /** 原始路径 */
  originalPath?: string
  /** 是否星标 */
  isStarred?: boolean | string
  /** 发送时间范围 */
  sendDateRange?: string[]
  /** 发送开始时间 */
  sendDateStart?: string
  /** 发送结束时间 */
  sendDateEnd?: string
  /** 导入批次ID */
  importBatchId?: number
  /** 排序字段 */
  orderBy?: string
  /** 排序方向 */
  orderDirection?: 'asc' | 'desc'
}

/** 分页响应结果 */
export interface PageResult<T> {
  /** 数据列表 */
  list: T[]
  /** 总数 */
  total: number
  /** 当前页 */
  pageNo: number
  /** 每页大小 */
  pageSize: number
}

/** API响应结果 */
export interface ApiResult<T = any> {
  /** 响应码 */
  code: number
  /** 响应数据 */
  data: T
  /** 响应消息 */
  msg: string
}

/** 邮件内容类型 */
export type EmailContentType = 'html' | 'text'

/** 邮件操作类型 */
export type EmailActionType = 'view' | 'star' | 'unstar' | 'delete' | 'download'

/** 文件树节点 */
export interface EmailTreeNode {
  /** 节点ID */
  id: string
  /** 节点标签 */
  label: string
  /** 节点路径 */
  path: string
  /** 子节点 */
  children?: EmailTreeNode[]
  /** 是否叶子节点 */
  isLeaf?: boolean
  /** 邮件数量 */
  emailCount?: number
}
