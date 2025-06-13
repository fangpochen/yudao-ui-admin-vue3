<template>
  <div class="email-table">
    <el-table
      ref="tableRef"
      :data="emailList"
      v-loading="loading"
      @selection-change="handleSelectionChange"
      @sort-change="handleSortChange"
      row-key="id"
      :default-sort="{ prop: 'sendDate', order: 'descending' }"
      stripe
      border
      style="width: 100%"
    >
      <!-- 选择列 -->
      <el-table-column
        type="selection"
        width="50"
        align="center"
        :selectable="(row) => !row.processing"
      />

      <!-- 星标列 -->
      <el-table-column label="星标" width="60" align="center">
        <template #default="{ row }">
          <el-button
            :icon="row.isStarred ? StarFilled : Star"
            @click="handleToggleStar(row)"
            text
            :class="{ 'star-active': row.isStarred }"
            :loading="loadingStates.star.has(row.id)"
            size="small"
          />
        </template>
      </el-table-column>

      <!-- 主题列 -->
      <el-table-column
        prop="subject"
        label="主题"
        min-width="300"
        show-overflow-tooltip
        sortable="custom"
      >
        <template #default="{ row }">
          <div class="subject-cell">
            <el-link
              @click="handleViewDetail(row)"
              type="primary"
              :underline="false"
              class="subject-link"
            >
              {{ row.subject || '(无主题)' }}
            </el-link>
            <!-- 附件图标 -->
            <el-icon
              v-if="row.attachmentCount > 0"
              class="attachment-icon"
              :title="`${row.attachmentCount}个附件`"
            >
              <Paperclip />
            </el-icon>
          </div>
        </template>
      </el-table-column>

      <!-- 发件人列 -->
      <el-table-column
        prop="sender"
        label="发件人"
        width="200"
        show-overflow-tooltip
        sortable="custom"
      >
        <template #default="{ row }">
          <div class="sender-cell">
            {{ getEmailDisplayName(row.sender) }}
          </div>
        </template>
      </el-table-column>

      <!-- 收件人列 -->
      <el-table-column label="收件人" width="200" show-overflow-tooltip>
        <template #default="{ row }">
          <div class="recipients-cell">
            {{ formatRecipients(row.recipients) }}
          </div>
        </template>
      </el-table-column>

      <!-- 发送时间列 -->
      <el-table-column prop="sendDate" label="发送时间" width="180" sortable="custom">
        <template #default="{ row }">
          {{ formatDateTime(row.sendDate) }}
        </template>
      </el-table-column>

      <!-- 附件数量列 -->
      <el-table-column
        label="附件"
        width="80"
        align="center"
        sortable="custom"
        sort-by="attachmentCount"
      >
        <template #default="{ row }">
          <el-badge :value="row.attachmentCount" v-if="row.attachmentCount > 0" type="info">
            <el-icon><Paperclip /></el-icon>
          </el-badge>
          <span v-else class="no-attachments">-</span>
        </template>
      </el-table-column>

      <!-- 原始路径列 -->
      <el-table-column prop="originalPath" label="原始路径" min-width="200" show-overflow-tooltip>
        <template #default="{ row }">
          <div class="path-cell">
            <el-text class="path-text" :title="row.originalPath" size="small">
              {{ row.originalPath }}
            </el-text>
          </div>
        </template>
      </el-table-column>

      <!-- 导入时间列 -->
      <el-table-column prop="createTime" label="导入时间" width="180" sortable="custom">
        <template #default="{ row }">
          {{ formatDateTime(row.createTime) }}
        </template>
      </el-table-column>

      <!-- 操作列 -->
      <el-table-column label="操作" width="120" fixed="right" align="center">
        <template #default="{ row }">
          <div class="action-buttons">
            <el-button @click="handleViewDetail(row)" type="primary" link size="small" :icon="View">
              查看
            </el-button>
            <el-button
              @click="handleDelete(row)"
              type="danger"
              link
              size="small"
              :icon="Delete"
              :loading="loadingStates.delete.has(row.id)"
            >
              删除
            </el-button>
          </div>
        </template>
      </el-table-column>
    </el-table>

    <!-- 分页组件 -->
    <div class="pagination-container" v-if="showPagination">
      <el-pagination
        :current-page="pagination.pageNo"
        :page-size="pagination.pageSize"
        :total="pagination.total"
        :page-sizes="[10, 20, 50, 100]"
        layout="total, sizes, prev, pager, next, jumper"
        @size-change="handleSizeChange"
        @current-change="handleCurrentChange"
        background
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Star, StarFilled, Paperclip, View, Delete } from '@element-plus/icons-vue'
import type { EmailMessage } from '@/types/eml/email'
import { formatDateTime, formatRecipients, getEmailDisplayName } from '@/utils/eml'
import { toggleEmailStar, deleteEmailMessage } from '@/api/eml/email'

// Props
interface Props {
  emailList: EmailMessage[]
  loading?: boolean
  showPagination?: boolean
  pagination?: {
    pageNo: number
    pageSize: number
    total: number
  }
}

const props = withDefaults(defineProps<Props>(), {
  loading: false,
  showPagination: true,
  pagination: () => ({
    pageNo: 1,
    pageSize: 20,
    total: 0
  })
})

// Emits
const emit = defineEmits<{
  'selection-change': [selection: EmailMessage[]]
  'view-detail': [email: EmailMessage]
  'star-change': [email: EmailMessage]
  'delete-email': [email: EmailMessage]
  'sort-change': [sortInfo: { prop: string; order: string }]
  'page-change': [pageInfo: { pageNo: number; pageSize: number }]
}>()

// Reactive data
const tableRef = ref()
const selectedEmails = ref<EmailMessage[]>([])
const loadingStates = ref({
  star: new Set<number>(),
  delete: new Set<number>()
})

// Methods
const handleSelectionChange = (selection: EmailMessage[]) => {
  selectedEmails.value = selection
  emit('selection-change', selection)
}

const handleToggleStar = async (row: EmailMessage) => {
  try {
    // 设置加载状态
    loadingStates.value.star.add(row.id)

    await toggleEmailStar(row.id)

    // 更新本地状态
    row.isStarred = !row.isStarred

    emit('star-change', row)
    ElMessage.success(row.isStarred ? '已标记星标' : '已取消星标')
  } catch (error: any) {
    console.error('Toggle star error:', error)
    ElMessage.error('操作失败：' + (error.message || '未知错误'))
  } finally {
    loadingStates.value.star.delete(row.id)
  }
}

const handleViewDetail = (row: EmailMessage) => {
  emit('view-detail', row)
}

const handleDelete = async (row: EmailMessage) => {
  try {
    await ElMessageBox.confirm(`确定要删除邮件"${row.subject || '(无主题)'}"吗？`, '删除确认', {
      type: 'warning',
      confirmButtonText: '确定删除',
      cancelButtonText: '取消'
    })

    // 设置加载状态
    loadingStates.value.delete.add(row.id)

    await deleteEmailMessage(row.id)

    emit('delete-email', row)
    ElMessage.success('删除成功')
  } catch (error: any) {
    if (error !== 'cancel') {
      console.error('Delete error:', error)
      ElMessage.error('删除失败：' + (error.message || '未知错误'))
    }
  } finally {
    loadingStates.value.delete.delete(row.id)
  }
}

const handleSortChange = (sortInfo: { prop: string; order: string | null }) => {
  if (sortInfo.order) {
    emit('sort-change', {
      prop: sortInfo.prop,
      order: sortInfo.order
    })
  }
}

const handleSizeChange = (size: number) => {
  emit('page-change', {
    pageNo: props.pagination.pageNo,
    pageSize: size
  })
}

const handleCurrentChange = (page: number) => {
  emit('page-change', {
    pageNo: page,
    pageSize: props.pagination.pageSize
  })
}

// 导出方法供父组件调用
const clearSelection = () => {
  tableRef.value?.clearSelection()
}

const toggleRowSelection = (row: EmailMessage, selected?: boolean) => {
  tableRef.value?.toggleRowSelection(row, selected)
}

const getSelectionRows = () => {
  return selectedEmails.value
}

defineExpose({
  clearSelection,
  toggleRowSelection,
  getSelectionRows
})
</script>

<style scoped lang="scss">
.email-table {
  .subject-cell {
    display: flex;
    align-items: center;
    gap: 8px;

    .subject-link {
      flex: 1;
      min-width: 0;
      font-weight: 500;

      &:hover {
        color: var(--el-color-primary);
      }
    }

    .attachment-icon {
      flex-shrink: 0;
      color: var(--el-color-warning);
      font-size: 14px;
    }
  }

  .sender-cell,
  .recipients-cell {
    color: var(--el-text-color-regular);
    font-size: 14px;
  }

  .path-cell {
    .path-text {
      color: var(--el-text-color-secondary);
      font-family: 'Courier New', monospace;
      font-size: 12px;
    }
  }

  .no-attachments {
    color: var(--el-text-color-placeholder);
    font-size: 12px;
  }

  .action-buttons {
    display: flex;
    gap: 4px;
    justify-content: center;
  }

  .star-active {
    color: #f39c12 !important;

    &:hover {
      color: #e67e22 !important;
    }
  }

  .pagination-container {
    margin-top: 20px;
    display: flex;
    justify-content: flex-end;
    padding: 16px 0;
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

    .el-table__empty-text {
      color: var(--el-text-color-placeholder);
    }
  }

  // 徽章样式
  :deep(.el-badge) {
    .el-badge__content {
      font-size: 11px;
      padding: 0 4px;
      height: 16px;
      line-height: 16px;
    }
  }

  // 链接按钮样式
  :deep(.el-button--text) {
    padding: 4px 8px;
    font-size: 12px;
  }
}

// 响应式处理
@media (max-width: 768px) {
  .email-table {
    :deep(.el-table) {
      font-size: 12px;
    }

    .pagination-container {
      justify-content: center;
    }
  }
}
</style>
