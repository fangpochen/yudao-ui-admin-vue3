// EML邮件管理系统 - 工具函数

import dayjs from 'dayjs'
import { ImportStatus, ImportStatusText, ImportStatusType } from '@/types/eml/import'

/**
 * 格式化日期时间
 * @param dateTime 日期时间字符串或Date对象
 * @param format 格式化模板，默认为 'YYYY-MM-DD HH:mm:ss'
 * @returns 格式化后的日期时间字符串
 */
export function formatDateTime(
  dateTime: string | Date | null | undefined,
  format: string = 'YYYY-MM-DD HH:mm:ss'
): string {
  if (!dateTime) return '-'
  return dayjs(dateTime).format(format)
}

/**
 * 格式化文件大小
 * @param bytes 字节数
 * @param decimals 小数位数，默认为2
 * @returns 格式化后的文件大小字符串
 */
export function formatFileSize(bytes: number | null | undefined, decimals: number = 2): string {
  if (!bytes || bytes === 0) return '0 B'

  const k = 1024
  const dm = decimals < 0 ? 0 : decimals
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB']

  const i = Math.floor(Math.log(bytes) / Math.log(k))

  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i]
}

/**
 * HTML内容安全处理
 * 注意：此处需要引入DOMPurify库进行真正的HTML清理
 * @param html HTML内容
 * @returns 清理后的HTML内容
 */
export function sanitizeHtml(html: string): string {
  if (!html) return ''

  // 简单的HTML清理，生产环境应使用DOMPurify
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // 移除script标签
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '') // 移除iframe标签
    .replace(/on\w+="[^"]*"/gi, '') // 移除事件处理器
    .replace(/javascript:/gi, '') // 移除javascript协议
}

/**
 * 获取导入状态信息
 * @param status 导入状态
 * @returns 状态文本和类型信息
 */
export function getImportStatusInfo(status: ImportStatus): {
  text: string
  type: 'success' | 'info' | 'warning' | 'danger'
} {
  return {
    text: ImportStatusText[status] || '未知',
    type: ImportStatusType[status] || 'info'
  }
}

/**
 * 下载文件
 * @param blob 文件blob对象
 * @param filename 文件名
 */
export function downloadFile(blob: Blob, filename: string): void {
  const url = window.URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  window.URL.revokeObjectURL(url)
}

/**
 * 下载附件
 * @param blob 附件文件blob
 * @param filename 文件名
 */
export function downloadAttachmentFile(blob: Blob, filename: string): void {
  downloadFile(blob, filename)
}

/**
 * 截取文本（用于显示摘要）
 * @param text 原始文本
 * @param maxLength 最大长度，默认100
 * @returns 截取后的文本
 */
export function truncateText(text: string | null | undefined, maxLength: number = 100): string {
  if (!text) return ''
  if (text.length <= maxLength) return text
  return text.substring(0, maxLength) + '...'
}

/**
 * 高亮搜索关键词
 * @param text 原始文本
 * @param keyword 搜索关键词
 * @returns 高亮后的HTML
 */
export function highlightKeyword(text: string, keyword: string): string {
  if (!text || !keyword) return text

  const regex = new RegExp(`(${keyword})`, 'gi')
  return text.replace(regex, '<mark>$1</mark>')
}

/**
 * 邮箱地址验证
 * @param email 邮箱地址
 * @returns 是否为有效邮箱
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

/**
 * 提取邮箱地址（从可能包含姓名的字符串中）
 * @param emailString 邮箱字符串，如 "张三 <zhangsan@example.com>"
 * @returns 纯邮箱地址
 */
export function extractEmail(emailString: string): string {
  if (!emailString) return ''

  const match = emailString.match(/<([^>]+)>/)
  if (match) {
    return match[1]
  }

  return emailString.trim()
}

/**
 * 获取邮箱显示名称
 * @param emailString 邮箱字符串，如 "张三 <zhangsan@example.com>"
 * @returns 显示名称，如果没有则返回邮箱地址
 */
export function getEmailDisplayName(emailString: string): string {
  if (!emailString) return ''

  const match = emailString.match(/^(.+?)\s*<([^>]+)>$/)
  if (match) {
    return match[1].trim().replace(/["']/g, '') || match[2]
  }

  return emailString.trim()
}

/**
 * 处理邮件收件人列表显示
 * @param recipients 收件人数组
 * @param maxDisplay 最多显示数量，默认3
 * @returns 处理后的显示字符串
 */
export function formatRecipients(
  recipients: string[] | null | undefined,
  maxDisplay: number = 3
): string {
  if (!recipients || recipients.length === 0) return ''

  const displayNames = recipients.slice(0, maxDisplay).map(getEmailDisplayName)
  const displayText = displayNames.join(', ')

  if (recipients.length > maxDisplay) {
    return `${displayText} 等${recipients.length}人`
  }

  return displayText
}

/**
 * 生成文件树节点ID
 * @param path 文件路径
 * @returns 节点ID
 */
export function generateTreeNodeId(path: string): string {
  return path.replace(/[\\\/]/g, '_').replace(/[^a-zA-Z0-9_-]/g, '')
}

/**
 * 解析文件路径为树形结构
 * @param paths 文件路径数组
 * @returns 树形节点数组
 */
export function parsePathsToTree(paths: string[]): any[] {
  const tree: any[] = []
  const pathMap = new Map<string, any>()

  paths.forEach((path) => {
    const segments = path.split(/[\\\/]/).filter(Boolean)
    let currentLevel = tree
    let currentPath = ''

    segments.forEach((segment, index) => {
      currentPath += (currentPath ? '/' : '') + segment
      const nodeId = generateTreeNodeId(currentPath)

      let existingNode = currentLevel.find((node) => node.id === nodeId)

      if (!existingNode) {
        existingNode = {
          id: nodeId,
          label: segment,
          path: currentPath,
          children: [],
          isLeaf: index === segments.length - 1,
          emailCount: 0
        }
        currentLevel.push(existingNode)
        pathMap.set(currentPath, existingNode)
      }

      if (index === segments.length - 1) {
        existingNode.emailCount++
      }

      currentLevel = existingNode.children
    })
  })

  return tree
}

/**
 * 计算成功率
 * @param successCount 成功数量
 * @param totalCount 总数量
 * @returns 成功率百分比
 */
export function calculateSuccessRate(successCount: number, totalCount: number): number {
  if (totalCount === 0) return 0
  return Math.round((successCount / totalCount) * 100)
}

/**
 * 格式化导入耗时
 * @param seconds 秒数
 * @returns 格式化后的时间字符串
 */
export function formatDuration(seconds: number | null | undefined): string {
  if (!seconds || seconds < 0) return '-'

  if (seconds < 60) {
    return `${seconds}秒`
  } else if (seconds < 3600) {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return remainingSeconds > 0 ? `${minutes}分${remainingSeconds}秒` : `${minutes}分钟`
  } else {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    return minutes > 0 ? `${hours}小时${minutes}分钟` : `${hours}小时`
  }
}

/**
 * 获取文件扩展名
 * @param filename 文件名
 * @returns 文件扩展名（不含点号）
 */
export function getFileExtension(filename: string): string {
  if (!filename) return ''
  const lastDotIndex = filename.lastIndexOf('.')
  return lastDotIndex > 0 ? filename.substring(lastDotIndex + 1).toLowerCase() : ''
}

/**
 * 检查是否为ZIP文件
 * @param file 文件对象
 * @returns 是否为ZIP文件
 */
export function isZipFile(file: File): boolean {
  const extension = getFileExtension(file.name)
  return (
    extension === 'zip' ||
    file.type === 'application/zip' ||
    file.type === 'application/x-zip-compressed'
  )
}

/**
 * 验证文件大小
 * @param file 文件对象
 * @param maxSizeInMB 最大大小（MB），默认500MB
 * @returns 验证结果
 */
export function validateFileSize(
  file: File,
  maxSizeInMB: number = 500
): {
  valid: boolean
  message?: string
} {
  const maxSizeInBytes = maxSizeInMB * 1024 * 1024

  if (file.size > maxSizeInBytes) {
    return {
      valid: false,
      message: `文件大小不能超过 ${maxSizeInMB}MB`
    }
  }

  return { valid: true }
}

/**
 * 构建邮件路径树
 * @param emails 邮件数据数组
 * @param showCount 是否显示计数
 * @returns 树形节点数组
 */
export function buildEmailPathTree(
  emails: Array<{
    id: number
    originalPath: string
    subject: string
  }>,
  showCount: boolean = true
): any[] {
  if (!emails || emails.length === 0) return []

  const tree: any[] = []
  const pathMap = new Map<string, any>()

  emails.forEach((email) => {
    const path = email.originalPath || ''
    const segments = path.split(/[\\\/]/).filter(Boolean)
    let currentLevel = tree
    let currentPath = ''

    segments.forEach((segment, index) => {
      currentPath += (currentPath ? '/' : '') + segment
      const isFile = index === segments.length - 1

      let existingNode = currentLevel.find((node) => node.path === currentPath)

      if (!existingNode) {
        existingNode = {
          path: currentPath,
          label: segment,
          children: isFile ? undefined : [],
          isFile,
          emailId: isFile ? email.id : undefined,
          count: 0,
          parentPath: currentPath.substring(0, currentPath.lastIndexOf('/'))
        }
        currentLevel.push(existingNode)
        pathMap.set(currentPath, existingNode)
      }

      if (isFile) {
        existingNode.emailId = email.id
        existingNode.count = 1
      } else {
        existingNode.count = (existingNode.count || 0) + 1
      }

      if (!isFile && existingNode.children) {
        currentLevel = existingNode.children
      }
    })
  })

  // 如果不显示计数，移除count属性
  if (!showCount) {
    const removeCount = (nodes: any[]) => {
      nodes.forEach((node) => {
        delete node.count
        if (node.children) {
          removeCount(node.children)
        }
      })
    }
    removeCount(tree)
  }

  return tree
}
