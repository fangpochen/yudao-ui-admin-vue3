<template>
  <div class="attachment-list">
    <div v-if="showHeader" class="attachment-header">
      <div class="header-left">
        <el-icon><Paperclip /></el-icon>
        <span class="title">附件列表</span>
        <el-tag v-if="attachments && attachments.length > 0" size="small" type="info">
          {{ attachments.length }}
        </el-tag>
      </div>
      <div v-if="!readonly" class="header-actions">
        <el-button
          v-if="selectedAttachments.length > 0"
          type="primary"
          size="small"
          @click="downloadSelected"
        >
          <el-icon><Download /></el-icon>
          批量下载 ({{ selectedAttachments.length }})
        </el-button>
        <el-button v-if="attachments && attachments.length > 0" size="small" @click="downloadAll">
          <el-icon><FolderAdd /></el-icon>
          全部下载
        </el-button>
      </div>
    </div>

    <div class="attachment-content">
      <template v-if="attachments && attachments.length > 0">
        <!-- 列表模式 -->
        <div v-if="viewMode === 'list'" class="attachment-list-view">
          <div
            v-for="attachment in attachments"
            :key="attachment.id"
            class="attachment-item"
            :class="{
              selected: selectedAttachments.includes(attachment.id),
              downloading: downloadingIds.includes(attachment.id)
            }"
            @click="toggleSelection(attachment.id)"
          >
            <div class="item-checkbox" v-if="!readonly">
              <el-checkbox
                :model-value="selectedAttachments.includes(attachment.id)"
                @change="toggleSelection(attachment.id)"
                @click.stop
              />
            </div>

            <div class="item-icon">
              <el-icon :size="24">
                <component :is="getFileIcon(attachment.fileName)" />
              </el-icon>
            </div>

            <div class="item-info">
              <div class="file-name" :title="attachment.fileName">
                {{ attachment.fileName }}
              </div>
              <div class="file-meta">
                <span class="file-size">{{ formatFileSize(attachment.fileSize) }}</span>
                <span class="file-type">{{ getFileType(attachment.fileName) }}</span>
                <span v-if="attachment.contentType" class="content-type">
                  {{ attachment.contentType }}
                </span>
              </div>
            </div>

            <div class="item-actions">
              <el-tooltip content="预览">
                <el-button
                  v-if="canPreview(attachment)"
                  type="text"
                  size="small"
                  @click.stop="previewAttachment(attachment)"
                >
                  <el-icon><View /></el-icon>
                </el-button>
              </el-tooltip>

              <el-tooltip content="下载">
                <el-button
                  type="text"
                  size="small"
                  :loading="downloadingIds.includes(attachment.id)"
                  @click.stop="downloadAttachment(attachment)"
                >
                  <el-icon><Download /></el-icon>
                </el-button>
              </el-tooltip>

              <el-dropdown v-if="!readonly" trigger="click" @click.stop>
                <el-button type="text" size="small">
                  <el-icon><MoreFilled /></el-icon>
                </el-button>
                <template #dropdown>
                  <el-dropdown-menu>
                    <el-dropdown-item @click="copyDownloadLink(attachment)">
                      <el-icon><Link /></el-icon>
                      复制下载链接
                    </el-dropdown-item>
                    <el-dropdown-item @click="viewAttachmentInfo(attachment)">
                      <el-icon><InfoFilled /></el-icon>
                      查看详情
                    </el-dropdown-item>
                  </el-dropdown-menu>
                </template>
              </el-dropdown>
            </div>
          </div>
        </div>

        <!-- 网格模式 -->
        <div v-else class="attachment-grid-view">
          <div
            v-for="attachment in attachments"
            :key="attachment.id"
            class="attachment-card"
            :class="{
              selected: selectedAttachments.includes(attachment.id),
              downloading: downloadingIds.includes(attachment.id)
            }"
            @click="toggleSelection(attachment.id)"
          >
            <div v-if="!readonly" class="card-checkbox">
              <el-checkbox
                :model-value="selectedAttachments.includes(attachment.id)"
                @change="toggleSelection(attachment.id)"
                @click.stop
              />
            </div>

            <div class="card-content">
              <div class="file-icon">
                <el-icon :size="48">
                  <component :is="getFileIcon(attachment.fileName)" />
                </el-icon>
              </div>

              <div class="file-info">
                <div class="file-name" :title="attachment.fileName">
                  {{ attachment.fileName }}
                </div>
                <div class="file-size">
                  {{ formatFileSize(attachment.fileSize) }}
                </div>
              </div>
            </div>

            <div class="card-actions">
              <el-button
                v-if="canPreview(attachment)"
                type="text"
                size="small"
                @click.stop="previewAttachment(attachment)"
              >
                预览
              </el-button>
              <el-button
                type="primary"
                size="small"
                :loading="downloadingIds.includes(attachment.id)"
                @click.stop="downloadAttachment(attachment)"
              >
                下载
              </el-button>
            </div>
          </div>
        </div>
      </template>

      <!-- 空状态 -->
      <div v-else class="attachment-empty">
        <el-empty description="暂无附件" :image-size="100">
          <template #image>
            <el-icon :size="60" color="#dcdde0">
              <Paperclip />
            </el-icon>
          </template>
        </el-empty>
      </div>
    </div>

    <!-- 工具栏 -->
    <div v-if="showToolbar && attachments && attachments.length > 0" class="attachment-toolbar">
      <div class="toolbar-left">
        <el-radio-group v-model="viewMode" size="small">
          <el-radio-button value="list">
            <el-icon><List /></el-icon>
            列表
          </el-radio-button>
          <el-radio-button value="grid">
            <el-icon><Grid /></el-icon>
            网格
          </el-radio-button>
        </el-radio-group>
      </div>

      <div class="toolbar-right">
        <span class="attachment-count"> 共 {{ attachments.length }} 个附件 </span>
      </div>
    </div>

    <!-- 预览对话框 -->
    <AttachmentPreviewDialog
      v-model="previewVisible"
      :attachment="previewAttachment"
      @download="downloadAttachment"
    />

    <!-- 详情对话框 -->
    <AttachmentInfoDialog v-model="infoVisible" :attachment="infoAttachment" />
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  Paperclip,
  Download,
  FolderAdd,
  View,
  MoreFilled,
  Link,
  InfoFilled,
  List,
  Grid,
  Document,
  Picture,
  VideoPlay,
  Headphone,
  Files
} from '@element-plus/icons-vue'
import { downloadAttachmentFile, formatFileSize } from '@/utils/eml'
import { downloadEmailAttachment } from '@/api/eml/email'
import type { EmailAttachment } from '@/types/eml/email'

// 导入对话框组件（这些组件需要另外创建）
const AttachmentPreviewDialog = defineAsyncComponent(() => import('./AttachmentPreviewDialog.vue'))
const AttachmentInfoDialog = defineAsyncComponent(() => import('./AttachmentInfoDialog.vue'))

// Props & Emits
interface Props {
  // 附件列表
  attachments?: EmailAttachment[]
  // 是否只读模式
  readonly?: boolean
  // 是否显示头部
  showHeader?: boolean
  // 是否显示工具栏
  showToolbar?: boolean
  // 默认视图模式
  defaultViewMode?: 'list' | 'grid'
  // 最大选择数量
  maxSelection?: number
}

interface Emits {
  (e: 'preview', attachment: EmailAttachment): void
  (e: 'download', attachment: EmailAttachment): void
  (e: 'selection-change', selectedIds: number[]): void
}

const props = withDefaults(defineProps<Props>(), {
  readonly: false,
  showHeader: true,
  showToolbar: true,
  defaultViewMode: 'list',
  maxSelection: 0
})

const emit = defineEmits<Emits>()

// 响应式数据
const selectedAttachments = ref<number[]>([])
const downloadingIds = ref<number[]>([])
const viewMode = ref<'list' | 'grid'>(props.defaultViewMode)
const previewVisible = ref(false)
const previewAttachment = ref<EmailAttachment>()
const infoVisible = ref(false)
const infoAttachment = ref<EmailAttachment>()

// 方法
const getFileIcon = (fileName: string) => {
  const ext = fileName.split('.').pop()?.toLowerCase() || ''

  // 图片文件
  if (['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg'].includes(ext)) {
    return Picture
  }

  // 视频文件
  if (['mp4', 'avi', 'mov', 'wmv', 'flv', 'mkv'].includes(ext)) {
    return VideoPlay
  }

  // 音频文件
  if (['mp3', 'wav', 'flac', 'aac', 'ogg'].includes(ext)) {
    return Headphone
  }

  // 压缩文件
  if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext)) {
    return Files
  }

  return Document
}

const getFileType = (fileName: string) => {
  const ext = fileName.split('.').pop()?.toLowerCase() || ''
  return ext.toUpperCase()
}

const canPreview = (attachment: EmailAttachment) => {
  const ext = attachment.fileName.split('.').pop()?.toLowerCase() || ''
  // 可预览的文件类型
  const previewableTypes = [
    'jpg',
    'jpeg',
    'png',
    'gif',
    'webp',
    'svg',
    'pdf',
    'txt',
    'html',
    'htm',
    'xml',
    'json'
  ]
  return previewableTypes.includes(ext)
}

const toggleSelection = (attachmentId: number) => {
  if (props.readonly) return

  const index = selectedAttachments.value.indexOf(attachmentId)
  if (index > -1) {
    selectedAttachments.value.splice(index, 1)
  } else {
    if (props.maxSelection > 0 && selectedAttachments.value.length >= props.maxSelection) {
      ElMessage.warning(`最多只能选择 ${props.maxSelection} 个附件`)
      return
    }
    selectedAttachments.value.push(attachmentId)
  }

  emit('selection-change', selectedAttachments.value)
}

const downloadAttachment = async (attachment: EmailAttachment) => {
  if (downloadingIds.value.includes(attachment.id)) return

  downloadingIds.value.push(attachment.id)

  try {
    const response = await downloadEmailAttachment(attachment.id)
    downloadAttachmentFile(response.data, attachment.fileName)
    emit('download', attachment)
    ElMessage.success('下载成功')
  } catch (error: any) {
    ElMessage.error(error.message || '下载失败')
  } finally {
    const index = downloadingIds.value.indexOf(attachment.id)
    if (index > -1) {
      downloadingIds.value.splice(index, 1)
    }
  }
}

const downloadSelected = async () => {
  if (selectedAttachments.value.length === 0) {
    ElMessage.warning('请先选择要下载的附件')
    return
  }

  try {
    await ElMessageBox.confirm(
      `确定要下载选中的 ${selectedAttachments.value.length} 个附件吗？`,
      '批量下载确认',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'info'
      }
    )

    // 批量下载逻辑
    for (const attachmentId of selectedAttachments.value) {
      const attachment = props.attachments?.find((a) => a.id === attachmentId)
      if (attachment) {
        await downloadAttachment(attachment)
      }
    }
  } catch (error) {
    // 用户取消
  }
}

const downloadAll = async () => {
  if (!props.attachments || props.attachments.length === 0) return

  try {
    await ElMessageBox.confirm(
      `确定要下载全部 ${props.attachments.length} 个附件吗？`,
      '下载全部确认',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'info'
      }
    )

    // 下载全部附件
    for (const attachment of props.attachments) {
      await downloadAttachment(attachment)
    }
  } catch (error) {
    // 用户取消
  }
}

const previewAttachment = (attachment: EmailAttachment) => {
  previewAttachment.value = attachment
  previewVisible.value = true
  emit('preview', attachment)
}

const copyDownloadLink = async (attachment: EmailAttachment) => {
  try {
    await navigator.clipboard.writeText(attachment.downloadUrl)
    ElMessage.success('下载链接已复制到剪贴板')
  } catch (error) {
    ElMessage.error('复制失败')
  }
}

const viewAttachmentInfo = (attachment: EmailAttachment) => {
  infoAttachment.value = attachment
  infoVisible.value = true
}

// 公开方法
const clearSelection = () => {
  selectedAttachments.value = []
  emit('selection-change', [])
}

const selectAll = () => {
  if (!props.attachments) return
  selectedAttachments.value = props.attachments.map((a) => a.id)
  emit('selection-change', selectedAttachments.value)
}

const getSelectedAttachments = () => {
  return props.attachments?.filter((a) => selectedAttachments.value.includes(a.id)) || []
}

// 暴露方法给父组件
defineExpose({
  clearSelection,
  selectAll,
  getSelectedAttachments
})
</script>

<style lang="scss" scoped>
.attachment-list {
  border: 1px solid var(--el-border-color);
  border-radius: 8px;
  background-color: var(--el-bg-color);
}

.attachment-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px;
  border-bottom: 1px solid var(--el-border-color);
  background-color: var(--el-fill-color-lighter);

  .header-left {
    display: flex;
    align-items: center;
    gap: 8px;

    .title {
      font-weight: 500;
      color: var(--el-text-color-primary);
    }
  }

  .header-actions {
    display: flex;
    gap: 8px;
  }
}

.attachment-content {
  padding: 16px;
}

// 列表视图样式
.attachment-list-view {
  .attachment-item {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px;
    border: 1px solid transparent;
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.2s ease;

    &:hover {
      background-color: var(--el-fill-color-light);
      border-color: var(--el-border-color);
    }

    &.selected {
      background-color: var(--el-color-primary-light-9);
      border-color: var(--el-color-primary);
    }

    &.downloading {
      opacity: 0.7;
      cursor: not-allowed;
    }

    &:not(:last-child) {
      margin-bottom: 8px;
    }

    .item-checkbox {
      flex-shrink: 0;
    }

    .item-icon {
      flex-shrink: 0;
      color: var(--el-color-primary);
    }

    .item-info {
      flex: 1;
      min-width: 0;

      .file-name {
        font-weight: 500;
        color: var(--el-text-color-primary);
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        margin-bottom: 4px;
      }

      .file-meta {
        display: flex;
        gap: 12px;
        font-size: 12px;
        color: var(--el-text-color-secondary);

        .file-size {
          font-weight: 500;
        }

        .file-type {
          padding: 2px 6px;
          background-color: var(--el-fill-color);
          border-radius: 4px;
        }
      }
    }

    .item-actions {
      display: flex;
      gap: 4px;
      opacity: 0;
      transition: opacity 0.2s;
    }

    &:hover .item-actions {
      opacity: 1;
    }
  }
}

// 网格视图样式
.attachment-grid-view {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 16px;

  .attachment-card {
    position: relative;
    border: 1px solid var(--el-border-color);
    border-radius: 8px;
    padding: 16px;
    cursor: pointer;
    transition: all 0.2s ease;
    background-color: var(--el-bg-color);

    &:hover {
      border-color: var(--el-color-primary);
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    }

    &.selected {
      border-color: var(--el-color-primary);
      background-color: var(--el-color-primary-light-9);
    }

    &.downloading {
      opacity: 0.7;
      cursor: not-allowed;
    }

    .card-checkbox {
      position: absolute;
      top: 8px;
      right: 8px;
    }

    .card-content {
      text-align: center;
      margin-bottom: 16px;

      .file-icon {
        color: var(--el-color-primary);
        margin-bottom: 12px;
      }

      .file-info {
        .file-name {
          font-weight: 500;
          color: var(--el-text-color-primary);
          margin-bottom: 4px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .file-size {
          font-size: 12px;
          color: var(--el-text-color-secondary);
        }
      }
    }

    .card-actions {
      display: flex;
      gap: 8px;
      justify-content: center;
    }
  }
}

.attachment-empty {
  padding: 40px 20px;
  text-align: center;
}

.attachment-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border-top: 1px solid var(--el-border-color);
  background-color: var(--el-fill-color-lighter);

  .attachment-count {
    font-size: 14px;
    color: var(--el-text-color-regular);
  }
}

// 响应式设计
@media (max-width: 768px) {
  .attachment-grid-view {
    grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
    gap: 12px;
  }

  .attachment-header {
    flex-direction: column;
    gap: 12px;
    align-items: stretch;

    .header-actions {
      justify-content: center;
    }
  }

  .attachment-toolbar {
    flex-direction: column;
    gap: 8px;
    align-items: stretch;
  }
}
</style>
