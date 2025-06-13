import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { EmailMessage, EmailQueryParams, EmailAttachment, PageResult } from '@/types/eml/email'
import type { ImportBatch, ImportBatchQueryParams, ImportErrorLog } from '@/types/eml/import'
import { ImportStatus } from '@/types/eml/import'
import {
  getEmailMessagePage,
  getEmailMessage,
  toggleEmailStar,
  deleteEmailMessages
} from '@/api/eml/email'
import { getImportBatchPage, getImportErrorLogs, uploadZipFile } from '@/api/eml/import'

export const useEmlStore = defineStore('eml', () => {
  // ===== 邮件管理状态 =====

  // 邮件列表数据
  const emailList = ref<EmailMessage[]>([])
  const emailTotal = ref(0)
  const emailLoading = ref(false)
  const currentEmail = ref<EmailMessage>()
  const emailAttachments = ref<EmailAttachment[]>([])

  // 查询参数
  const emailQueryParams = ref<EmailQueryParams>({
    pageNo: 1,
    pageSize: 20
  })

  // 选中的邮件IDs
  const selectedEmailIds = ref<number[]>([])

  // ===== 导入管理状态 =====

  // 导入批次数据
  const importBatchList = ref<ImportBatch[]>([])
  const importBatchTotal = ref(0)
  const importBatchLoading = ref(false)
  const currentBatch = ref<ImportBatch>()

  // 导入错误日志
  const importErrorLogs = ref<ImportErrorLog[]>([])
  const errorLogTotal = ref(0)
  const errorLogLoading = ref(false)

  // 导入查询参数
  const importQueryParams = ref<ImportBatchQueryParams>({
    pageNo: 1,
    pageSize: 20
  })

  // 上传状态
  const uploadProgress = ref(0)
  const uploading = ref(false)

  // ===== 计算属性 =====

  // 选中邮件数量
  const selectedEmailCount = computed(() => selectedEmailIds.value.length)

  // 是否有选中邮件
  const hasSelectedEmails = computed(() => selectedEmailIds.value.length > 0)

  // 当前邮件是否有附件
  const currentEmailHasAttachments = computed(
    () => emailAttachments.value && emailAttachments.value.length > 0
  )

  // 邮件统计信息
  const emailStats = computed(() => {
    const starredCount = emailList.value.filter((email) => email.isStarred).length
    const attachmentCount = emailList.value.filter((email) => email.attachmentCount > 0).length

    return {
      total: emailTotal.value,
      starred: starredCount,
      withAttachments: attachmentCount
    }
  })

  // 导入统计信息
  const importStats = computed(() => {
    const completedCount = importBatchList.value.filter(
      (batch) => batch.status === ImportStatus.COMPLETED
    ).length
    const failedCount = importBatchList.value.filter(
      (batch) => batch.status === ImportStatus.FAILED
    ).length
    const processingCount = importBatchList.value.filter(
      (batch) => batch.status === ImportStatus.PROCESSING
    ).length

    return {
      total: importBatchTotal.value,
      completed: completedCount,
      failed: failedCount,
      processing: processingCount
    }
  })

  // ===== 邮件管理动作 =====

  /**
   * 获取邮件列表
   */
  const fetchEmailList = async (params?: Partial<EmailQueryParams>) => {
    if (params) {
      Object.assign(emailQueryParams.value, params)
    }

    emailLoading.value = true
    try {
      const response = await getEmailMessagePage(emailQueryParams.value)
      const data = response.data as PageResult<EmailMessage>

      emailList.value = data.list || []
      emailTotal.value = data.total || 0

      return data
    } catch (error) {
      console.error('获取邮件列表失败:', error)
      throw error
    } finally {
      emailLoading.value = false
    }
  }

  /**
   * 获取邮件详情
   */
  const fetchEmailDetail = async (emailId: number) => {
    try {
      const response = await getEmailMessage(emailId)
      currentEmail.value = response.data
      emailAttachments.value = response.data.attachments || []

      return response.data
    } catch (error) {
      console.error('获取邮件详情失败:', error)
      throw error
    }
  }

  /**
   * 切换邮件星标状态
   */
  const toggleStar = async (emailId: number) => {
    try {
      await toggleEmailStar(emailId)

      // 更新本地状态
      const email = emailList.value.find((e) => e.id === emailId)
      if (email) {
        email.isStarred = !email.isStarred
      }

      if (currentEmail.value?.id === emailId) {
        currentEmail.value.isStarred = !currentEmail.value.isStarred
      }

      return true
    } catch (error) {
      console.error('切换星标失败:', error)
      throw error
    }
  }

  /**
   * 批量删除邮件
   */
  const batchDeleteEmails = async (emailIds: number[]) => {
    try {
      await deleteEmailMessages(emailIds)

      // 更新本地状态
      emailList.value = emailList.value.filter((email) => !emailIds.includes(email.id))
      emailTotal.value = Math.max(0, emailTotal.value - emailIds.length)

      // 清除选中状态
      selectedEmailIds.value = selectedEmailIds.value.filter((id) => !emailIds.includes(id))

      return true
    } catch (error) {
      console.error('批量删除邮件失败:', error)
      throw error
    }
  }

  /**
   * 设置选中的邮件
   */
  const setSelectedEmails = (emailIds: number[]) => {
    selectedEmailIds.value = emailIds
  }

  /**
   * 清除选中的邮件
   */
  const clearSelectedEmails = () => {
    selectedEmailIds.value = []
  }

  /**
   * 切换邮件选中状态
   */
  const toggleEmailSelection = (emailId: number) => {
    const index = selectedEmailIds.value.indexOf(emailId)
    if (index > -1) {
      selectedEmailIds.value.splice(index, 1)
    } else {
      selectedEmailIds.value.push(emailId)
    }
  }

  /**
   * 全选/取消全选邮件
   */
  const toggleAllEmailSelection = (selectAll: boolean) => {
    if (selectAll) {
      selectedEmailIds.value = emailList.value.map((email) => email.id)
    } else {
      selectedEmailIds.value = []
    }
  }

  // ===== 导入管理动作 =====

  /**
   * 获取导入批次列表
   */
  const fetchImportBatchList = async (params?: Partial<ImportBatchQueryParams>) => {
    if (params) {
      Object.assign(importQueryParams.value, params)
    }

    importBatchLoading.value = true
    try {
      const response = await getImportBatchPage(importQueryParams.value)
      const data = response.data as PageResult<ImportBatch>

      importBatchList.value = data.list || []
      importBatchTotal.value = data.total || 0

      return data
    } catch (error) {
      console.error('获取导入批次列表失败:', error)
      throw error
    } finally {
      importBatchLoading.value = false
    }
  }

  /**
   * 获取导入错误日志
   */
  const fetchImportErrorLogs = async (batchId: number, params?: any) => {
    errorLogLoading.value = true
    try {
      const response = await getImportErrorLogs({
        batchId,
        pageNo: 1,
        pageSize: 100,
        ...params
      })
      const data = response.data as PageResult<ImportErrorLog>

      importErrorLogs.value = data.list || []
      errorLogTotal.value = data.total || 0

      return data
    } catch (error) {
      console.error('获取导入错误日志失败:', error)
      throw error
    } finally {
      errorLogLoading.value = false
    }
  }

  /**
   * 上传ZIP文件
   */
  const uploadZipFileWithProgress = async (file: File, onProgress?: (progress: number) => void) => {
    uploading.value = true
    uploadProgress.value = 0

    try {
      const response = await uploadZipFile(file, (progressEvent: any) => {
        if (progressEvent.total) {
          const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total)
          uploadProgress.value = progress
          onProgress?.(progress)
        }
      })

      // 上传成功后刷新导入批次列表
      await fetchImportBatchList()

      return response.data
    } catch (error) {
      console.error('上传ZIP文件失败:', error)
      throw error
    } finally {
      uploading.value = false
      uploadProgress.value = 0
    }
  }

  /**
   * 设置当前批次
   */
  const setCurrentBatch = (batch: ImportBatch) => {
    currentBatch.value = batch
  }

  // ===== 重置状态 =====

  /**
   * 重置邮件状态
   */
  const resetEmailState = () => {
    emailList.value = []
    emailTotal.value = 0
    emailLoading.value = false
    currentEmail.value = undefined
    emailAttachments.value = []
    selectedEmailIds.value = []
    emailQueryParams.value = {
      pageNo: 1,
      pageSize: 20
    }
  }

  /**
   * 重置导入状态
   */
  const resetImportState = () => {
    importBatchList.value = []
    importBatchTotal.value = 0
    importBatchLoading.value = false
    currentBatch.value = undefined
    importErrorLogs.value = []
    errorLogTotal.value = 0
    errorLogLoading.value = false
    importQueryParams.value = {
      pageNo: 1,
      pageSize: 20
    }
    uploadProgress.value = 0
    uploading.value = false
  }

  /**
   * 重置所有状态
   */
  const resetAllState = () => {
    resetEmailState()
    resetImportState()
  }

  return {
    // 邮件管理状态
    emailList,
    emailTotal,
    emailLoading,
    currentEmail,
    emailAttachments,
    emailQueryParams,
    selectedEmailIds,

    // 导入管理状态
    importBatchList,
    importBatchTotal,
    importBatchLoading,
    currentBatch,
    importErrorLogs,
    errorLogTotal,
    errorLogLoading,
    importQueryParams,
    uploadProgress,
    uploading,

    // 计算属性
    selectedEmailCount,
    hasSelectedEmails,
    currentEmailHasAttachments,
    emailStats,
    importStats,

    // 邮件管理动作
    fetchEmailList,
    fetchEmailDetail,
    toggleStar,
    batchDeleteEmails,
    setSelectedEmails,
    clearSelectedEmails,
    toggleEmailSelection,
    toggleAllEmailSelection,

    // 导入管理动作
    fetchImportBatchList,
    fetchImportErrorLogs,
    uploadZipFileWithProgress,
    setCurrentBatch,

    // 重置状态
    resetEmailState,
    resetImportState,
    resetAllState
  }
})
