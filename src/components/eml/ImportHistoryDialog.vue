<template>
  <el-dialog
    v-model="dialogVisible"
    title="导入历史"
    width="1000px"
    @close="handleClose"
    :close-on-click-modal="false"
  >
    <!-- 搜索区域 -->
    <div class="search-area" v-if="showSearch">
      <el-form :model="queryForm" :inline="true" @submit.prevent="handleSearch">
        <el-form-item label="批次名称">
          <el-input
            v-model="queryForm.batchName"
            placeholder="请输入批次名称"
            clearable
            style="width: 200px"
          />
        </el-form-item>
        <el-form-item label="状态">
          <el-select
            v-model="queryForm.status"
            placeholder="请选择状态"
            clearable
            style="width: 150px"
          >
            <el-option
              v-for="(text, value) in statusOptions"
              :key="value"
              :label="text"
              :value="Number(value)"
            />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="handleSearch" :loading="loading"> 搜索 </el-button>
          <el-button @click="resetSearch"> 重置 </el-button>
        </el-form-item>
      </el-form>
    </div>

    <!-- 导入批次表格 -->
    <el-table :data="importBatches" v-loading="loading" stripe border>
      <el-table-column prop="batchName" label="批次名称" min-width="200" show-overflow-tooltip />

      <el-table-column prop="zipFilename" label="ZIP文件名" min-width="200" show-overflow-tooltip />

      <el-table-column label="状态" width="100" align="center">
        <template #default="{ row }">
          <el-tag :type="getStatusInfo(row.status).type">
            {{ getStatusInfo(row.status).text }}
          </el-tag>
        </template>
      </el-table-column>

      <el-table-column prop="totalFiles" label="总文件数" width="100" align="center" />

      <el-table-column prop="successCount" label="成功" width="80" align="center">
        <template #default="{ row }">
          <span class="success-count">{{ row.successCount }}</span>
        </template>
      </el-table-column>

      <el-table-column prop="failCount" label="失败" width="80" align="center">
        <template #default="{ row }">
          <span :class="{ 'error-count': row.failCount > 0 }">
            {{ row.failCount }}
          </span>
        </template>
      </el-table-column>

      <el-table-column label="成功率" width="100" align="center">
        <template #default="{ row }">
          <div class="success-rate">
            <span v-if="row.totalFiles > 0">
              {{ Math.round((row.successCount / row.totalFiles) * 100) }}%
            </span>
            <span v-else>-</span>
            <el-progress
              v-if="row.totalFiles > 0"
              :percentage="Math.round((row.successCount / row.totalFiles) * 100)"
              :show-text="false"
              :stroke-width="4"
              :status="row.failCount > 0 ? 'exception' : 'success'"
              style="margin-top: 4px"
            />
          </div>
        </template>
      </el-table-column>

      <el-table-column label="耗时" width="100" align="center">
        <template #default="{ row }">
          {{ formatDuration(row.processingTime) }}
        </template>
      </el-table-column>

      <el-table-column prop="createTime" label="创建时间" width="180">
        <template #default="{ row }">
          {{ formatDateTime(row.createTime) }}
        </template>
      </el-table-column>

      <el-table-column label="操作" width="180" align="center" fixed="right">
        <template #default="{ row }">
          <div class="action-buttons">
            <el-button @click="handleViewEmails(row)" type="primary" link size="small" :icon="View">
              查看邮件
            </el-button>
            <el-button
              v-if="row.failCount > 0"
              @click="handleViewErrors(row)"
              type="warning"
              link
              size="small"
              :icon="Warning"
            >
              查看错误
            </el-button>
            <el-button @click="handleDelete(row)" type="danger" link size="small" :icon="Delete">
              删除
            </el-button>
          </div>
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
      />
    </div>

    <!-- 空状态 -->
    <el-empty
      v-if="!loading && importBatches.length === 0"
      description="暂无导入记录"
      :image-size="80"
    />

    <template #footer>
      <div class="dialog-footer">
        <el-button @click="handleClose">关闭</el-button>
        <el-button type="primary" @click="handleRefresh" :loading="loading"> 刷新 </el-button>
      </div>
    </template>

    <!-- 错误日志对话框 -->
    <ErrorLogDialog
      v-model:visible="errorLogVisible"
      :batch-id="selectedBatchId"
      :batch-name="selectedBatchName"
    />
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, reactive, computed, watch, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { View, Warning, Delete } from '@element-plus/icons-vue'

import ErrorLogDialog from './ErrorLogDialog.vue'

import type { ImportBatch, ImportBatchQueryParams, ImportStatus } from '@/types/eml/import'
import { getImportBatchPage, deleteImportBatch } from '@/api/eml/import'
import {
  getImportStatusInfo,
  formatDateTime,
  formatDuration,
  calculateSuccessRate
} from '@/utils/eml'

// Props & Emits
interface Props {
  visible: boolean
  showSearch?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  showSearch: true
})

const emit = defineEmits<{
  'update:visible': [value: boolean]
  'batch-detail': [batch: ImportBatch]
  'view-emails': [batch: ImportBatch]
}>()

// Reactive data
const loading = ref(false)
const importBatches = ref<ImportBatch[]>([])
const errorLogVisible = ref(false)
const selectedBatchId = ref<number>(0)
const selectedBatchName = ref<string>('')

// 分页信息
const pagination = reactive({
  pageNo: 1,
  pageSize: 10,
  total: 0
})

// 查询表单
const queryForm = reactive<ImportBatchQueryParams>({
  batchName: '',
  status: undefined
})

// 状态选项
const statusOptions = {
  1: '处理中',
  2: '成功',
  3: '部分失败',
  4: '失败'
}

// Computed
const dialogVisible = computed({
  get: () => props.visible,
  set: (value) => emit('update:visible', value)
})

// Methods
const getImportBatchList = async () => {
  try {
    loading.value = true

    const params: ImportBatchQueryParams = {
      pageNo: pagination.pageNo,
      pageSize: pagination.pageSize,
      ...queryForm
    }

    const response = await getImportBatchPage(params)
    console.log('API返回原始数据 (批次列表):', response)

    // 安全地获取数据 - 处理不同的响应格式
    const data = response.data || response
    if (!data) {
      console.error('API返回数据为空:', response)
      importBatches.value = []
      pagination.total = 0
      return
    }

    // 安全地获取列表数据
    importBatches.value = data.list || data.records || []
    pagination.total = data.total || data.totalCount || 0

    console.log('解析后的数据:', { 
      list: importBatches.value, 
      total: pagination.total 
    })
  } catch (error: any) {
    console.error('Get import batch list error:', error)
    console.error('错误详情:', error.message, error.stack)
    ElMessage.error('获取导入历史失败：' + (error.message || '未知错误'))
    importBatches.value = []
    pagination.total = 0
  } finally {
    loading.value = false
  }
}

const getStatusInfo = (status: ImportStatus) => {
  return getImportStatusInfo(status)
}

const handleSearch = () => {
  pagination.pageNo = 1
  getImportBatchList()
}

const resetSearch = () => {
  Object.assign(queryForm, {
    batchName: '',
    status: undefined
  })
  pagination.pageNo = 1
  getImportBatchList()
}

const handleRefresh = () => {
  getImportBatchList()
}

const handleSizeChange = (size: number) => {
  pagination.pageSize = size
  pagination.pageNo = 1
  getImportBatchList()
}

const handleCurrentChange = (page: number) => {
  pagination.pageNo = page
  getImportBatchList()
}

const handleViewEmails = (batch: ImportBatch) => {
  emit('batch-detail', batch)
  emit('view-emails', batch)
}

const handleViewErrors = (batch: ImportBatch) => {
  selectedBatchId.value = batch.id
  selectedBatchName.value = batch.batchName
  errorLogVisible.value = true
}

const handleDelete = async (batch: ImportBatch) => {
  try {
    await ElMessageBox.confirm(
      `确定要删除导入批次"${batch.batchName}"吗？这将删除该批次的所有邮件数据。`,
      '删除确认',
      {
        type: 'warning',
        confirmButtonText: '确定删除',
        cancelButtonText: '取消'
      }
    )

    await deleteImportBatch(batch.id)

    ElMessage.success('删除成功')
    getImportBatchList()
  } catch (error: any) {
    if (error !== 'cancel') {
      console.error('Delete batch error:', error)
      ElMessage.error('删除失败：' + (error.message || '未知错误'))
    }
  }
}

const handleClose = () => {
  emit('update:visible', false)
}

// Watch
watch(
  () => props.visible,
  (visible) => {
    if (visible) {
      getImportBatchList()
    }
  }
)

// Lifecycle
onMounted(() => {
  if (props.visible) {
    getImportBatchList()
  }
})
</script>

<style scoped lang="scss">
.search-area {
  margin-bottom: 20px;
  padding: 16px;
  background-color: var(--el-bg-color-page);
  border-radius: 6px;
}

.success-count {
  color: var(--el-color-success);
  font-weight: 600;
}

.error-count {
  color: var(--el-color-danger);
  font-weight: 600;
}

.success-rate {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.action-buttons {
  display: flex;
  flex-direction: column;
  gap: 4px;
  align-items: center;
}

.dialog-pagination {
  margin-top: 20px;
  display: flex;
  justify-content: center;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

// 表格样式优化
:deep(.el-table) {
  .el-table__header {
    th {
      background-color: var(--el-bg-color-page);
      color: var(--el-text-color-primary);
      font-weight: 600;
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
  }
}

// 标签样式
:deep(.el-tag) {
  font-weight: 500;
}

// 进度条样式
:deep(.el-progress) {
  .el-progress-bar__outer {
    background-color: var(--el-fill-color-light);
  }
}
</style>
