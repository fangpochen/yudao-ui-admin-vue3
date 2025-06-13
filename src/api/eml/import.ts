import request from '@/config/axios'
import type {
  ImportBatch,
  ImportBatchQueryParams,
  ImportErrorLog,
  ImportErrorQueryParams
} from '@/types/eml/import'
import type { PageResult, ApiResult } from '@/types/eml/email'

// API基础路径
const API_BASE = '/system/email-import'

/**
 * 上传ZIP文件进行导入
 * @param file ZIP文件
 * @param onProgress 上传进度回调
 * @returns 导入批次信息
 */
export async function uploadZipFile(file: File, onProgress?: (progressEvent: any) => void) {
  const formData = new FormData()
  formData.append('file', file)

  return await request.upload({
    url: `${API_BASE}/upload-zip`,
    data: formData,
    onUploadProgress: onProgress
  })
}

/**
 * 分页查询导入批次列表
 * @param params 查询参数
 * @returns 导入批次列表分页数据
 */
export async function getImportBatchPage(params: ImportBatchQueryParams) {
  // 处理时间范围参数
  if (params.createTimeRange && params.createTimeRange.length === 2) {
    params.createTimeStart = params.createTimeRange[0]
    params.createTimeEnd = params.createTimeRange[1]
    delete params.createTimeRange
  }

  return await request.get({ url: `${API_BASE}/import/batches`, params })
}

/**
 * 获取导入批次详情
 * @param id 批次ID
 * @returns 导入批次详情
 */
export async function getImportBatch(id: number) {
  return await request.get({ url: `${API_BASE}/import-batch/${id}` })
}

/**
 * 查询导入错误日志
 * @param params 查询参数
 * @returns 错误日志分页数据
 */
export async function getImportErrorLogs(params: ImportErrorQueryParams) {
  return await request.get({ url: `${API_BASE}/import/errors/${params.batchId}`, params })
}

/**
 * 删除导入批次
 * @param id 批次ID
 * @returns 操作结果
 */
export async function deleteImportBatch(id: number) {
  return await request.delete({ url: `${API_BASE}/import-batch/${id}` })
}

/**
 * 批量删除导入批次
 * @param ids 批次ID数组
 * @returns 操作结果
 */
export async function deleteImportBatches(ids: number[]) {
  return await request.delete({ url: `${API_BASE}/import-batches/batch`, data: ids })
}

/**
 * 重新导入失败的文件
 * @param batchId 批次ID
 * @returns 操作结果
 */
export async function retryImportBatch(batchId: number) {
  return await request.post({ url: `${API_BASE}/import-batch/${batchId}/retry` })
}

/**
 * 获取导入进度
 * @param batchId 批次ID
 * @returns 进度信息
 */
export async function getImportProgress(batchId: number) {
  return await request.get({ url: `${API_BASE}/import-progress/${batchId}` })
}

/**
 * 取消正在进行的导入
 * @param batchId 批次ID
 * @returns 操作结果
 */
export async function cancelImport(batchId: number) {
  return await request.post({ url: `${API_BASE}/import-batch/${batchId}/cancel` })
}

/**
 * 导出导入日志
 * @param batchId 批次ID
 * @returns 导出文件流
 */
export async function exportImportLog(batchId: number) {
  return await request.download({ url: `${API_BASE}/import-batch/${batchId}/export-log` })
}

/**
 * 获取导入统计信息
 * @returns 统计数据
 */
export async function getImportStatistics() {
  return await request.get({ url: `${API_BASE}/import-statistics` })
}

/**
 * 清理导入临时文件
 * @param batchId 批次ID
 * @returns 操作结果
 */
export async function cleanupImportFiles(batchId: number) {
  return await request.post({ url: `${API_BASE}/import-batch/${batchId}/cleanup` })
}
