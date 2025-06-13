import request from '@/config/axios'
import type {
  EmailMessage,
  EmailQueryParams,
  PageResult,
  ApiResult,
  EmailAttachment
} from '@/types/eml/email'

// API基础路径
const API_BASE = '/system/email'

/**
 * 分页查询邮件列表
 * @param params 查询参数
 * @returns 邮件列表分页数据
 */
export async function getEmailMessagePage(params: EmailQueryParams) {
  // 处理时间范围参数
  if (params.sendDateRange && params.sendDateRange.length === 2) {
    params.sendDateStart = params.sendDateRange[0]
    params.sendDateEnd = params.sendDateRange[1]
    delete params.sendDateRange
  }

  return await request.get({ url: `${API_BASE}/page`, params })
}

/**
 * 获取邮件详情
 * @param id 邮件ID
 * @returns 邮件详情
 */
export async function getEmailMessage(id: number) {
  return await request.get({ url: `${API_BASE}/get`, params: { id } })
}

/**
 * 切换邮件星标状态
 * @param id 邮件ID
 * @returns 操作结果
 */
export async function toggleEmailStar(id: number) {
  return await request.put({ url: `${API_BASE}/toggle-star`, params: { id } })
}

/**
 * 批量删除邮件
 * @param ids 邮件ID数组
 * @returns 操作结果
 * @deprecated 后端接口尚未实现
 */
export async function deleteEmailMessages(ids: number[]) {
  return await request.delete({ url: `${API_BASE}/batch`, data: ids })
}

/**
 * 删除单个邮件
 * @param id 邮件ID
 * @returns 操作结果
 */
export async function deleteEmailMessage(id: number) {
  return await request.delete({ url: `${API_BASE}/delete`, params: { id } })
}

/**
 * 下载附件
 * @param attachmentId 附件ID
 * @returns 文件流
 * @deprecated 后端接口尚未实现
 */
export async function downloadAttachment(attachmentId: number) {
  return await request.download({ url: `${API_BASE}/attachment/${attachmentId}/download` })
}

/**
 * 获取附件信息
 * @param attachmentId 附件ID
 * @returns 附件信息
 * @deprecated 后端接口尚未实现
 */
export async function getAttachmentInfo(attachmentId: number) {
  return await request.get({ url: `${API_BASE}/attachment/${attachmentId}` })
}

/**
 * 导出邮件数据
 * @param params 查询参数
 * @returns 导出文件流
 * @deprecated 后端接口尚未实现
 */
export async function exportEmailMessages(params: EmailQueryParams) {
  // 处理时间范围参数
  if (params.sendDateRange && params.sendDateRange.length === 2) {
    params.sendDateStart = params.sendDateRange[0]
    params.sendDateEnd = params.sendDateRange[1]
    delete params.sendDateRange
  }

  return await request.download({ url: `${API_BASE}/export`, params })
}

/**
 * 获取邮件统计信息
 * @returns 统计数据
 */
export async function getEmailStatistics() {
  return await request.get({ url: `${API_BASE}/statistics` })
}

/**
 * 获取文件树结构
 * @param path 路径（可选）
 * @returns 文件树节点
 * @deprecated 后端接口尚未实现
 */
export async function getEmailFileTree(path?: string) {
  return await request.get({ url: `${API_BASE}/file-tree`, params: { path } })
}


