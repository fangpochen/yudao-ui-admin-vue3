<template>
  <el-dialog
    v-model="dialogVisible"
    :title="`导入错误日志 - ${batchName}`"
    width="800px"
    @close="handleClose"
    :close-on-click-modal="false"
  >
    <!-- 错误统计 -->
    <div class="error-stats" v-if="errorLogs.length > 0">
      <el-alert
        :title="`共发现 ${pagination.total} 个错误`"
        type="error"
        :closable="false"
        show-icon
      />
    </div>

    <!-- 错误日志表格 -->
    <el-table :data="errorLogs" v-loading="loading" stripe border max-height="400">
      <el-table-column type="index" label="#" width="50" align="center" />

      <el-table-column prop="filePath" label="文件路径" min-width="200" show-overflow-tooltip>
        <template #default="{ row }">
          <div class="file-path">
            <el-icon class="file-icon"><Document /></el-icon>
            {{ row.filePath }}
          </div>
        </template>
      </el-table-column>

      <el-table-column prop="errorType" label="错误类型" width="120" align="center">
        <template #default="{ row }">
          <el-tag type="danger" size="small">
            {{ row.errorType }}
          </el-tag>
        </template>
      </el-table-column>

      <el-table-column prop="errorMessage" label="错误信息" min-width="250" show-overflow-tooltip>
        <template #default="{ row }">
          <div class="error-message">
            {{ row.errorMessage }}
          </div>
        </template>
      </el-table-column>

      <el-table-column prop="createTime" label="发生时间" width="160">
        <template #default="{ row }">
          {{ formatDateTime(row.createTime) }}
        </template>
      </el-table-column>

      <el-table-column label="操作" width="100" align="center">
        <template #default="{ row }">
          <el-button @click="handleViewDetail(row)" type="primary" link size="small" :icon="View">
            详情
          </el-button>
        </template>
      </el-table-column>
    </el-table>

    <!-- 分页 -->
    <div class="dialog-pagination" v-if="pagination.total > 0">
      <el-pagination
        v-model:current-page="pagination.pageNo"
        v-model:page-size="pagination.pageSize"
        :total="pagination.total"
        :page-sizes="[10, 20, 50]"
        layout="total, sizes, prev, pager, next"
        @size-change="handleSizeChange"
        @current-change="handleCurrentChange"
        background
        small
      />
    </div>

    <!-- 空状态 -->
    <el-empty
      v-if="!loading && errorLogs.length === 0"
      description="暂无错误日志"
      :image-size="60"
    />

    <template #footer>
      <div class="dialog-footer">
        <el-button @click="handleClose">关闭</el-button>
        <el-button type="primary" @click="handleExport" :loading="exportLoading" :icon="Download">
          导出日志
        </el-button>
      </div>
    </template>

    <!-- 错误详情对话框 -->
    <el-dialog v-model="detailVisible" title="错误详情" width="600px" append-to-body>
      <div class="error-detail" v-if="selectedError">
        <el-descriptions :column="1" border>
          <el-descriptions-item label="文件路径">
            <el-text class="file-path-text">{{ selectedError.filePath }}</el-text>
          </el-descriptions-item>
          <el-descriptions-item label="错误类型">
            <el-tag type="danger">{{ selectedError.errorType }}</el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="错误信息">
            <div class="error-message-detail">{{ selectedError.errorMessage }}</div>
          </el-descriptions-item>
          <el-descriptions-item label="发生时间">
            {{ formatDateTime(selectedError.createTime) }}
          </el-descriptions-item>
        </el-descriptions>

        <!-- 错误堆栈 -->
        <div v-if="selectedError.errorStack" class="error-stack">
          <h4>错误堆栈</h4>
          <el-scrollbar height="200px">
            <pre class="stack-trace">{{ selectedError.errorStack }}</pre>
          </el-scrollbar>
        </div>
      </div>
    </el-dialog>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, reactive, computed, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { Document, View, Download } from '@element-plus/icons-vue'

import type { ImportErrorLog, ImportErrorQueryParams } from '@/types/eml/import'
import { getImportErrorLogs, exportImportLog } from '@/api/eml/import'
import { formatDateTime, downloadFile } from '@/utils/eml'

// Props & Emits
interface Props {
  visible: boolean
  batchId: number
  batchName: string
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'update:visible': [value: boolean]
}>()

// Reactive data
const loading = ref(false)
const exportLoading = ref(false)
const detailVisible = ref(false)
const errorLogs = ref<ImportErrorLog[]>([])
const selectedError = ref<ImportErrorLog | null>(null)

// 分页信息
const pagination = reactive({
  pageNo: 1,
  pageSize: 10,
  total: 0
})

// Computed
const dialogVisible = computed({
  get: () => props.visible,
  set: (value) => emit('update:visible', value)
})

// Methods
const getErrorLogList = async () => {
  if (!props.batchId) return

  try {
    loading.value = true

    const params: ImportErrorQueryParams = {
      batchId: props.batchId,
      pageNo: pagination.pageNo,
      pageSize: pagination.pageSize
    }

    const { data } = await getImportErrorLogs(params)

    errorLogs.value = data.list || []
    pagination.total = data.total || 0
  } catch (error: any) {
    console.error('Get error logs error:', error)
    ElMessage.error('获取错误日志失败：' + (error.message || '未知错误'))
  } finally {
    loading.value = false
  }
}

const handleSizeChange = (size: number) => {
  pagination.pageSize = size
  pagination.pageNo = 1
  getErrorLogList()
}

const handleCurrentChange = (page: number) => {
  pagination.pageNo = page
  getErrorLogList()
}

const handleViewDetail = (errorLog: ImportErrorLog) => {
  selectedError.value = errorLog
  detailVisible.value = true
}

const handleExport = async () => {
  try {
    exportLoading.value = true

    const blob = await exportImportLog(props.batchId)
    downloadFile(
      blob,
      `导入错误日志_${props.batchName}_${new Date().toISOString().split('T')[0]}.xlsx`
    )

    ElMessage.success('导出成功')
  } catch (error: any) {
    console.error('Export error logs error:', error)
    ElMessage.error('导出失败：' + (error.message || '未知错误'))
  } finally {
    exportLoading.value = false
  }
}

const handleClose = () => {
  emit('update:visible', false)
  // 重置数据
  errorLogs.value = []
  pagination.pageNo = 1
  pagination.total = 0
}

// Watch
watch(
  () => [props.visible, props.batchId],
  ([visible, batchId]) => {
    if (visible && batchId) {
      getErrorLogList()
    }
  },
  { immediate: true }
)
</script>

<style scoped lang="scss">
.error-stats {
  margin-bottom: 16px;
}

.file-path {
  display: flex;
  align-items: center;
  gap: 6px;

  .file-icon {
    color: var(--el-color-warning);
    font-size: 14px;
  }
}

.error-message {
  color: var(--el-color-danger);
  font-size: 13px;
  line-height: 1.4;
}

.dialog-pagination {
  margin-top: 16px;
  display: flex;
  justify-content: center;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

.error-detail {
  .file-path-text {
    font-family: 'Courier New', monospace;
    font-size: 12px;
    color: var(--el-text-color-secondary);
  }

  .error-message-detail {
    color: var(--el-color-danger);
    line-height: 1.5;
    word-break: break-all;
  }

  .error-stack {
    margin-top: 20px;

    h4 {
      margin: 0 0 12px 0;
      color: var(--el-text-color-primary);
      font-size: 14px;
      font-weight: 600;
    }

    .stack-trace {
      font-family: 'Courier New', monospace;
      font-size: 11px;
      line-height: 1.4;
      color: var(--el-text-color-secondary);
      background-color: var(--el-bg-color-page);
      padding: 12px;
      border-radius: 4px;
      margin: 0;
      white-space: pre-wrap;
      word-break: break-all;
    }
  }
}

// 表格样式优化
:deep(.el-table) {
  font-size: 13px;

  .el-table__header {
    th {
      background-color: var(--el-bg-color-page);
      color: var(--el-text-color-primary);
      font-weight: 600;
      font-size: 13px;
    }
  }

  .el-table__body {
    tr {
      &:hover {
        background-color: var(--el-bg-color-page);
      }

      &.el-table__row--striped {
        background-color: var(--el-fill-color-lighter);

        &:hover {
          background-color: var(--el-bg-color-page);
        }
      }
    }

    td {
      padding: 8px 0;
    }
  }
}

// 描述列表样式
:deep(.el-descriptions) {
  .el-descriptions__label {
    font-weight: 600;
    color: var(--el-text-color-primary);
  }

  .el-descriptions__content {
    word-break: break-all;
  }
}

// 标签样式
:deep(.el-tag) {
  font-size: 11px;
}

// 滚动条样式
:deep(.el-scrollbar) {
  .el-scrollbar__view {
    padding: 0;
  }
}
</style>
