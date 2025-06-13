// EML邮件管理系统 - 导入相关类型定义

/** 导入批次实体 */
export interface ImportBatch {
  /** 批次ID */
  id: number
  /** 批次名称 */
  batchName: string
  /** ZIP文件名 */
  zipFilename: string
  /** 用户ID */
  userId: number
  /** 用户名 */
  userName?: string
  /** 导入状态 */
  status: ImportStatus
  /** 总文件数 */
  totalFiles: number
  /** 成功数量 */
  successCount: number
  /** 失败数量 */
  failCount: number
  /** 失败数量（别名） */
  failureCount?: number
  /** 创建时间 */
  createTime: string
  /** 完成时间 */
  completeTime?: string
  /** 处理耗时（秒） */
  processingTime?: number
  /** 错误信息 */
  errorMessage?: string
}

/** 导入状态枚举 */
export enum ImportStatus {
  /** 处理中 */
  PROCESSING = 1,
  /** 成功 */
  COMPLETED = 2,
  /** 部分失败 */
  PARTIAL_SUCCESS = 3,
  /** 失败 */
  FAILED = 4
}

/** 导入状态文本映射 */
export const ImportStatusText = {
  [ImportStatus.PROCESSING]: '处理中',
  [ImportStatus.COMPLETED]: '成功',
  [ImportStatus.PARTIAL_SUCCESS]: '部分失败',
  [ImportStatus.FAILED]: '失败'
}

/** 导入状态类型映射 */
export const ImportStatusType = {
  [ImportStatus.PROCESSING]: 'info',
  [ImportStatus.COMPLETED]: 'success',
  [ImportStatus.PARTIAL_SUCCESS]: 'warning',
  [ImportStatus.FAILED]: 'danger'
} as const

/** 导入错误日志 */
export interface ImportErrorLog {
  /** 错误ID */
  id: number
  /** 导入批次ID */
  batchId: number
  /** 文件路径 */
  filePath: string
  /** 错误类型 */
  errorType: string
  /** 错误信息 */
  errorMessage: string
  /** 错误堆栈 */
  errorStack?: string
  /** 创建时间 */
  createTime: string
}

/** 导入批次查询参数 */
export interface ImportBatchQueryParams {
  /** 页码 */
  pageNo?: number
  /** 每页大小 */
  pageSize?: number
  /** 批次名称 */
  batchName?: string
  /** 用户ID */
  userId?: number
  /** 导入状态 */
  status?: ImportStatus
  /** 创建时间范围 */
  createTimeRange?: string[]
  /** 创建开始时间 */
  createTimeStart?: string
  /** 创建结束时间 */
  createTimeEnd?: string
}

/** 导入错误日志查询参数 */
export interface ImportErrorQueryParams {
  /** 页码 */
  pageNo?: number
  /** 每页大小 */
  pageSize?: number
  /** 导入批次ID */
  batchId: number
  /** 错误类型 */
  errorType?: string
  /** 文件路径 */
  filePath?: string
}

/** 文件上传进度 */
export interface UploadProgress {
  /** 已上传大小 */
  loaded: number
  /** 总大小 */
  total: number
  /** 进度百分比 */
  percent: number
  /** 上传状态 */
  status: 'uploading' | 'success' | 'error'
  /** 状态文本 */
  statusText?: string
}

/** 上传文件信息 */
export interface UploadFileInfo {
  /** 文件名 */
  name: string
  /** 文件大小 */
  size: number
  /** 文件类型 */
  type: string
  /** 文件对象 */
  file: File
  /** 上传状态 */
  status: 'ready' | 'uploading' | 'success' | 'error'
  /** 上传进度 */
  progress: UploadProgress
  /** 响应数据 */
  response?: any
  /** 错误信息 */
  error?: string
}
