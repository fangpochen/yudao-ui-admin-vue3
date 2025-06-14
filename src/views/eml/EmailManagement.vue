<template>
  <div class="email-management">
    <!-- 页面标题 -->
    <div class="page-header">
      <h1 class="page-title">EML邮件管理</h1>
      <div class="page-description">管理导入的EML邮件文件，支持查看、搜索和下载附件</div>
    </div>

    <!-- 顶部操作栏 -->
    <el-card class="toolbar-card" shadow="never">
      <div class="top-toolbar">
        <div class="toolbar-left">
          <el-button type="primary" @click="showUploadDialog" :icon="Upload" size="default">
            导入邮件
          </el-button>
          <el-button @click="showImportHistory" :icon="Clock" size="default"> 导入历史 </el-button>
          <el-button
            type="danger"
            @click="batchDelete"
            :disabled="selectedEmails.length === 0"
            :icon="Delete"
            size="default"
          >
            批量删除 ({{ selectedEmails.length }})
          </el-button>
        </div>
        <div class="toolbar-right">
          <el-button @click="refreshData" :icon="Refresh" :loading="tableLoading" size="default">
            刷新
          </el-button>
          <el-button @click="exportData" :icon="Download" size="default"> 导出 </el-button>
        </div>
      </div>
    </el-card>

    <!-- 搜索表单 -->
    <el-card class="search-card" shadow="never">
      <el-form :model="queryForm" :inline="true" @submit.prevent="handleSearch" label-width="80px">
        <el-row :gutter="20">
          <el-col :span="6">
            <el-form-item label="主题">
              <el-input
                v-model="queryForm.subject"
                placeholder="请输入邮件主题"
                clearable
                @keyup.enter="handleSearch"
              />
            </el-form-item>
          </el-col>
          <el-col :span="6">
            <el-form-item label="发件人">
              <el-input
                v-model="queryForm.sender"
                placeholder="请输入发件人邮箱"
                clearable
                @keyup.enter="handleSearch"
              />
            </el-form-item>
          </el-col>
          <el-col :span="6">
            <el-form-item label="收件人">
              <el-input
                v-model="queryForm.recipient"
                placeholder="请输入收件人邮箱"
                clearable
                @keyup.enter="handleSearch"
              />
            </el-form-item>
          </el-col>
          <el-col :span="6">
            <el-form-item label="原始路径">
              <el-input
                v-model="queryForm.originalPath"
                placeholder="请输入文件路径"
                clearable
                @keyup.enter="handleSearch"
              />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="20">
          <el-col :span="6">
            <el-form-item label="星标状态">
              <el-select
                v-model="queryForm.isStarred"
                placeholder="请选择"
                clearable
                style="width: 100%"
              >
                <el-option label="全部" value="" />
                <el-option label="已标记" :value="true" />
                <el-option label="未标记" :value="false" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="10">
            <el-form-item label="发送时间">
              <el-date-picker
                v-model="queryForm.sendDateRange"
                type="datetimerange"
                range-separator="至"
                start-placeholder="开始时间"
                end-placeholder="结束时间"
                format="YYYY-MM-DD HH:mm:ss"
                value-format="YYYY-MM-DD HH:mm:ss"
                style="width: 100%"
              />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label=" " label-width="0">
              <div class="search-buttons">
                <el-button
                  type="primary"
                  @click="handleSearch"
                  :icon="Search"
                  :loading="tableLoading"
                >
                  搜索
                </el-button>
                <el-button @click="resetSearch" :icon="RefreshRight"> 重置 </el-button>
              </div>
            </el-form-item>
          </el-col>
        </el-row>
      </el-form>
    </el-card>

    <!-- 统计信息 -->
    <el-row :gutter="15" class="stats-row">
      <el-col :span="5">
        <el-card class="stats-card">
          <div class="stats-item">
            <div class="stats-value">{{ stats.totalCount }}</div>
            <div class="stats-label">总邮件数</div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="5">
        <el-card class="stats-card">
          <div class="stats-item">
            <div class="stats-value star-count">{{ stats.starredCount }}</div>
            <div class="stats-label">星标邮件</div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="5">
        <el-card class="stats-card">
          <div class="stats-item">
            <div class="stats-value attachment-count">{{ stats.withAttachmentsCount }}</div>
            <div class="stats-label">有附件邮件</div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="5">
        <el-card class="stats-card">
          <div class="stats-item">
            <div class="stats-value">{{ stats.todayCount }}</div>
            <div class="stats-label">今日导入</div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="4">
        <el-card class="stats-card">
          <div class="stats-item">
            <div class="stats-value">{{ stats.weekCount }}</div>
            <div class="stats-label">本周导入</div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 主内容区域 -->
    <div class="content-layout">
      <!-- 左侧文件树筛选面板 -->
      <div class="sidebar-panel" v-if="showTreeFilter">
        <el-card class="tree-card" shadow="never">
          <template #header>
            <div class="tree-header">
              <span>文件目录</span>
              <el-button type="text" size="small" @click="toggleTreeFilter">
                <el-icon><Close /></el-icon>
              </el-button>
            </div>
          </template>
          <EmailTreeFilter
            :emails="emailList"
            :multiple="false"
            @selection-change="handleTreeFilterChange"
            @current-change="handleTreeCurrentChange"
            @view-email="handleViewDetail"
          />
        </el-card>
      </div>

      <!-- 右侧邮件表格 -->
      <div class="table-panel">
        <el-card class="table-card" shadow="never">
          <template #header>
            <div class="table-header">
              <span>邮件列表</span>
              <div class="header-actions">
                <el-button
                  v-if="!showTreeFilter"
                  type="text"
                  size="small"
                  @click="toggleTreeFilter"
                >
                  <el-icon><Operation /></el-icon>
                  显示文件树
                </el-button>
              </div>
            </div>
          </template>

          <EmailTable
            ref="emailTableRef"
            :email-list="emailList"
            :loading="tableLoading"
            :pagination="pagination"
            @selection-change="handleSelectionChange"
            @view-detail="handleViewDetail"
            @star-change="handleStarChange"
            @delete-email="handleDeleteEmail"
            @sort-change="handleSortChange"
            @page-change="handlePageChange"
          />
        </el-card>
      </div>
    </div>

    <!-- 上传对话框 -->
    <UploadDialog
      v-model:visible="uploadDialogVisible"
      @upload-success="handleUploadSuccess"
      @upload-error="handleUploadError"
    />

    <!-- 导入历史对话框 -->
    <ImportHistoryDialog v-model:visible="importHistoryVisible" @batch-detail="handleBatchDetail" />
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  Upload,
  Clock,
  Delete,
  Refresh,
  Download,
  Search,
  RefreshRight,
  Operation,
  Close
} from '@element-plus/icons-vue'

import EmailTable from '@/components/eml/EmailTable.vue'
import UploadDialog from '@/components/eml/UploadDialog.vue'
import ImportHistoryDialog from '@/components/eml/ImportHistoryDialog.vue'
import EmailTreeFilter from '@/components/eml/EmailTreeFilter.vue'

import type { EmailMessage, EmailQueryParams } from '@/types/eml/email'
import {
  getEmailMessagePage,
  deleteEmailMessages,
  exportEmailMessages,
  getEmailStatistics
} from '@/api/eml/email'

// Router
const router = useRouter()

// Reactive data
const emailTableRef = ref()
const uploadDialogVisible = ref(false)
const importHistoryVisible = ref(false)
const tableLoading = ref(false)
const emailList = ref<EmailMessage[]>([])
const selectedEmails = ref<EmailMessage[]>([])
const showTreeFilter = ref(false)

// 分页信息
const pagination = reactive({
  pageNo: 1,
  pageSize: 20,
  total: 0,
  monthCount: 0
})

// 查询表单
const queryForm = reactive<EmailQueryParams>({
  subject: '',
  sender: '',
  recipient: '',
  originalPath: '',
  isStarred: '',
  sendDateRange: []
})

// 排序信息
const sortInfo = reactive({
  prop: 'sendDate',
  order: 'descending'
})

// 统计信息
const stats = reactive({
  totalCount: 0,
  starredCount: 0,
  withAttachmentsCount: 0,
  todayCount: 0,
  weekCount: 0,
  monthCount: 0
})

// Methods
const getEmailList = async () => {
  try {
    tableLoading.value = true

    const params: EmailQueryParams = {
      pageNo: pagination.pageNo,
      pageSize: pagination.pageSize,
      ...queryForm
    }

    // 处理排序
    if (sortInfo.prop && sortInfo.order) {
      params.orderBy = sortInfo.prop
      params.orderDirection = sortInfo.order === 'ascending' ? 'asc' : 'desc'
    }

    const response = await getEmailMessagePage(params)

    // 检查响应数据结构，防止因API返回格式不一致而报错
    if (response && (response.list || (response.data && response.data.list))) {
      const pageData = response.list ? response : response.data
      emailList.value = pageData.list || []
      pagination.total = pageData.total || 0
    } else {
      // 如果数据结构不正确，重置为空，并给出明确错误提示
      emailList.value = []
      pagination.total = 0
      ElMessage.error('获取邮件列表失败：返回数据格式不正确')
      console.error('Unexpected API response structure:', response)
    }
  } catch (error: any) {
    console.error('Get email list error:', error)
    ElMessage.error('获取邮件列表失败：' + (error.message || '未知错误'))
  } finally {
    tableLoading.value = false
  }
}

const getStatistics = async () => {
  try {
    console.log('开始获取统计信息...')
    const response = await getEmailStatistics()
    console.log('API完整响应:', response)
    
    // 直接使用response.data，因为Yudao框架的CommonResult格式是这样的
    const data = response.data || response
    console.log('解构出的data:', data)
    console.log('当前stats对象:', JSON.stringify(stats))
    
    if (data && typeof data === 'object') {
      // 手动更新每个字段，确保响应式更新
      stats.totalCount = data.totalCount || 0
      stats.starredCount = data.starredCount || 0  
      stats.withAttachmentsCount = data.withAttachmentsCount || 0
      stats.todayCount = data.todayCount || 0
      stats.weekCount = data.weekCount || 0
      stats.monthCount = data.monthCount || 0
      
      console.log('更新后的stats:', JSON.stringify(stats))
      console.log('页面应该显示 totalCount:', stats.totalCount)
    } else {
      console.warn('Invalid statistics data received:', data)
    }
  } catch (error: any) {
    console.error('Get statistics error:', error)
    ElMessage.error('获取统计信息失败：' + (error.message || '网络异常'))
  }
}

const handleSearch = () => {
  pagination.pageNo = 1
  getEmailList()
}

const resetSearch = () => {
  Object.assign(queryForm, {
    subject: '',
    sender: '',
    recipient: '',
    originalPath: '',
    isStarred: '',
    sendDateRange: []
  })
  pagination.pageNo = 1
  getEmailList()
}

const refreshData = () => {
  getEmailList()
  getStatistics()
}

const handleSelectionChange = (selection: EmailMessage[]) => {
  selectedEmails.value = selection
}

const handleViewDetail = (item: EmailMessage | number) => {
  const emailId = typeof item === 'number' ? item : item.id
  router.push({
    name: 'EmailDetail',
    params: { id: emailId }
  })
}

const handleStarChange = (email: EmailMessage) => {
  // 更新统计信息
  if (email.isStarred) {
    stats.starredCount++
  } else {
    stats.starredCount--
  }
}

const handleDeleteEmail = (email: EmailMessage) => {
  // 从列表中移除
  const index = emailList.value.findIndex((item) => item.id === email.id)
  if (index > -1) {
    emailList.value.splice(index, 1)
    pagination.total--
  }

  // 更新统计信息
  stats.totalCount--
  if (email.isStarred) {
    stats.starredCount--
  }
}

const batchDelete = async () => {
  if (selectedEmails.value.length === 0) {
    ElMessage.warning('请选择要删除的邮件')
    return
  }

  try {
    await ElMessageBox.confirm(
      `确定要删除选中的 ${selectedEmails.value.length} 封邮件吗？此操作不可恢复。`,
      '批量删除确认',
      {
        type: 'warning',
        confirmButtonText: '确定删除',
        cancelButtonText: '取消'
      }
    )

    const ids = selectedEmails.value.map((item) => item.id)
    await deleteEmailMessages(ids)

    ElMessage.success(`成功删除 ${selectedEmails.value.length} 封邮件`)

    // 清空选择
    emailTableRef.value?.clearSelection()

    // 刷新数据
    refreshData()
  } catch (error: any) {
    if (error !== 'cancel') {
      console.error('Batch delete error:', error)
      ElMessage.error('批量删除失败：' + (error.message || '未知错误'))
    }
  }
}

const exportData = async () => {
  try {
    const params = { ...queryForm }
    const blob = await exportEmailMessages(params)

    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `邮件导出_${new Date().toISOString().split('T')[0]}.xlsx`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)

    ElMessage.success('导出成功')
  } catch (error: any) {
    console.error('Export error:', error)
    ElMessage.error('导出失败：' + (error.message || '未知错误'))
  }
}

const handleSortChange = (newSortInfo: { prop: string; order: string }) => {
  Object.assign(sortInfo, newSortInfo)
  pagination.pageNo = 1
  getEmailList()
}

const handlePageChange = (pageInfo: { pageNo: number; pageSize: number }) => {
  Object.assign(pagination, pageInfo)
  getEmailList()
}

const showUploadDialog = () => {
  uploadDialogVisible.value = true
}

const showImportHistory = () => {
  importHistoryVisible.value = true
}

const handleUploadSuccess = (result: any) => {
  ElMessage.success('上传成功！正在处理中...')
  uploadDialogVisible.value = false

  // 刷新数据（延迟一下，给后端处理时间）
  setTimeout(() => {
    refreshData()
  }, 2000)
}

const handleUploadError = (error: any) => {
  console.error('Upload error:', error)
}

const handleBatchDetail = (batch: any) => {
  // 根据批次ID筛选邮件
  queryForm.importBatchId = batch.id
  handleSearch()
  importHistoryVisible.value = false
}

const toggleTreeFilter = () => {
  showTreeFilter.value = !showTreeFilter.value
}

const handleTreeFilterChange = (selection) => {
  // TODO: Implement tree filter logic
  console.log('Tree filter changed:', selection)
}

const handleTreeCurrentChange = (data, node) => {
  // TODO: Implement tree current node change logic
  console.log('Tree current node changed:', data, node)
}

// Lifecycle
onMounted(() => {
  getEmailList()
  getStatistics()
})
</script>

<style scoped lang="scss">
.email-management {
  padding: 20px;
  background-color: var(--el-bg-color);
  min-height: calc(100vh - 60px);

  .page-header {
    margin-bottom: 20px;

    .page-title {
      margin: 0;
      font-size: 24px;
      font-weight: 600;
      color: var(--el-text-color-primary);
    }

    .page-description {
      margin-top: 8px;
      color: var(--el-text-color-secondary);
      font-size: 14px;
    }
  }

  .toolbar-card {
    margin-bottom: 20px;

    :deep(.el-card__body) {
      padding: 16px 20px;
    }

    .top-toolbar {
      display: flex;
      justify-content: space-between;
      align-items: center;

      .toolbar-left,
      .toolbar-right {
        display: flex;
        gap: 12px;
      }
    }
  }

  .search-card {
    margin-bottom: 20px;

    :deep(.el-card__body) {
      padding: 20px;
    }

    .search-buttons {
      display: flex;
      gap: 12px;
    }
  }

  .stats-row {
    margin-bottom: 20px;

    .stats-card {
      text-align: center;
      cursor: pointer;
      transition: all 0.3s ease;

      &:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
      }

      :deep(.el-card__body) {
        padding: 20px 16px;
      }

      .stats-item {
        .stats-value {
          font-size: 28px;
          font-weight: 700;
          color: var(--el-color-primary);
          margin-bottom: 8px;

          &.star-count {
            color: var(--el-color-warning);
          }

          &.attachment-count {
            color: var(--el-color-success);
          }
        }

        .stats-label {
          font-size: 14px;
          color: var(--el-text-color-secondary);
        }
      }
    }
  }

  .table-card {
    :deep(.el-card__body) {
      padding: 0;
    }
  }

  // 响应式处理
  @media (max-width: 1200px) {
    .top-toolbar {
      flex-direction: column;
      gap: 16px;
      align-items: stretch !important;

      .toolbar-left,
      .toolbar-right {
        justify-content: center;
      }
    }
  }

  @media (max-width: 768px) {
    padding: 16px;

    .stats-row {
      .el-col {
        margin-bottom: 16px;
      }
    }

    .search-card {
      :deep(.el-form) {
        .el-row {
          .el-col {
            margin-bottom: 16px;
          }
        }
      }
    }
  }
}
</style>
