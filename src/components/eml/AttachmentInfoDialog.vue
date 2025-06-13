<template>
  <Dialog v-model="dialogVisible" title="附件详情" width="600px" class="attachment-info-dialog">
    <div v-if="attachment" class="info-container">
      <!-- 文件基本信息 -->
      <div class="info-section">
        <h3 class="section-title">
          <el-icon><InfoFilled /></el-icon>
          基本信息
        </h3>
        <div class="info-content">
          <div class="info-item">
            <span class="label">文件名：</span>
            <span class="value" :title="attachment.fileName">{{ attachment.fileName }}</span>
          </div>
          <div class="info-item">
            <span class="label">文件大小：</span>
            <span class="value">{{ formatFileSize(attachment.fileSize) }}</span>
          </div>
          <div class="info-item">
            <span class="label">文件类型：</span>
            <span class="value">{{ getFileType(attachment.fileName) }}</span>
          </div>
          <div v-if="attachment.contentType" class="info-item">
            <span class="label">MIME类型：</span>
            <span class="value">{{ attachment.contentType }}</span>
          </div>
        </div>
      </div>

      <!-- 下载信息 -->
      <div class="info-section">
        <h3 class="section-title">
          <el-icon><Download /></el-icon>
          下载信息
        </h3>
        <div class="info-content">
          <div class="info-item">
            <span class="label">下载链接：</span>
            <div class="download-link">
              <el-input :model-value="attachment.downloadUrl" readonly size="small">
                <template #append>
                  <el-button @click="copyDownloadUrl">
                    <el-icon><CopyDocument /></el-icon>
                  </el-button>
                </template>
              </el-input>
            </div>
          </div>
          <div v-if="attachment.minioPath" class="info-item">
            <span class="label">存储路径：</span>
            <span class="value mono">{{ attachment.minioPath }}</span>
          </div>
        </div>
      </div>

      <!-- 邮件关联信息 -->
      <div class="info-section">
        <h3 class="section-title">
          <el-icon><Message /></el-icon>
          邮件信息
        </h3>
        <div class="info-content">
          <div class="info-item">
            <span class="label">邮件ID：</span>
            <span class="value">{{ attachment.emailId }}</span>
          </div>
          <div class="info-item">
            <span class="label">附件ID：</span>
            <span class="value">{{ attachment.id }}</span>
          </div>
        </div>
      </div>

      <!-- 文件预览/操作 -->
      <div class="info-section">
        <h3 class="section-title">
          <el-icon><Operation /></el-icon>
          操作
        </h3>
        <div class="info-content">
          <div class="action-buttons">
            <el-button v-if="canPreview" type="primary" @click="handlePreview">
              <el-icon><View /></el-icon>
              预览文件
            </el-button>
            <el-button type="success" @click="handleDownload" :loading="downloading">
              <el-icon><Download /></el-icon>
              下载文件
            </el-button>
            <el-button @click="copyDownloadUrl">
              <el-icon><Link /></el-icon>
              复制链接
            </el-button>
          </div>
        </div>
      </div>
    </div>

    <template #footer>
      <div class="dialog-footer">
        <el-button @click="dialogVisible = false">关闭</el-button>
      </div>
    </template>
  </Dialog>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { ElMessage } from 'element-plus'
import {
  InfoFilled,
  Download,
  CopyDocument,
  Message,
  Operation,
  View,
  Link
} from '@element-plus/icons-vue'
import { Dialog } from '@/components/Dialog'
import { formatFileSize } from '@/utils/eml'
import type { EmailAttachment } from '@/types/eml/email'

// Props & Emits
interface Props {
  modelValue: boolean
  attachment?: EmailAttachment
}

interface Emits {
  (e: 'update:modelValue', value: boolean): void
  (e: 'preview', attachment: EmailAttachment): void
  (e: 'download', attachment: EmailAttachment): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

// 响应式数据
const dialogVisible = computed({
  get: () => props.modelValue,
  set: (value: boolean) => emit('update:modelValue', value)
})

const downloading = ref(false)

// 计算属性
const canPreview = computed(() => {
  if (!props.attachment) return false

  const ext = getFileExtension(props.attachment.fileName)
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
    'json',
    'csv',
    'md'
  ]
  return previewableTypes.includes(ext)
})

// 方法
const getFileExtension = (fileName: string): string => {
  return fileName.split('.').pop()?.toLowerCase() || ''
}

const getFileType = (fileName: string): string => {
  const ext = getFileExtension(fileName)
  return ext.toUpperCase()
}

const copyDownloadUrl = async () => {
  if (!props.attachment?.downloadUrl) return

  try {
    await navigator.clipboard.writeText(props.attachment.downloadUrl)
    ElMessage.success('下载链接已复制到剪贴板')
  } catch (error) {
    ElMessage.error('复制失败')
  }
}

const handlePreview = () => {
  if (props.attachment) {
    emit('preview', props.attachment)
  }
}

const handleDownload = () => {
  if (props.attachment) {
    downloading.value = true
    emit('download', props.attachment)

    // 模拟下载完成（实际应该在父组件中处理）
    setTimeout(() => {
      downloading.value = false
    }, 2000)
  }
}
</script>

<style lang="scss" scoped>
.info-container {
  padding: 20px 0;
}

.info-section {
  margin-bottom: 24px;

  &:last-child {
    margin-bottom: 0;
  }

  .section-title {
    display: flex;
    align-items: center;
    gap: 8px;
    margin: 0 0 16px 0;
    font-size: 16px;
    font-weight: 500;
    color: var(--el-text-color-primary);
    border-bottom: 1px solid var(--el-border-color-lighter);
    padding-bottom: 8px;
  }

  .info-content {
    padding-left: 8px;
  }
}

.info-item {
  display: flex;
  align-items: flex-start;
  margin-bottom: 12px;

  &:last-child {
    margin-bottom: 0;
  }

  .label {
    min-width: 80px;
    flex-shrink: 0;
    font-weight: 500;
    color: var(--el-text-color-primary);
    margin-right: 12px;
  }

  .value {
    flex: 1;
    color: var(--el-text-color-regular);
    word-break: break-all;

    &.mono {
      font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
      font-size: 14px;
      background-color: var(--el-fill-color-light);
      padding: 4px 8px;
      border-radius: 4px;
    }
  }
}

.download-link {
  flex: 1;

  .el-input {
    :deep(.el-input__wrapper) {
      padding-right: 0;
    }

    :deep(.el-input-group__append) {
      padding: 0;

      .el-button {
        border-left: none;
      }
    }
  }
}

.action-buttons {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .info-item {
    flex-direction: column;
    align-items: stretch;

    .label {
      margin-bottom: 4px;
      margin-right: 0;
    }
  }

  .action-buttons {
    flex-direction: column;

    .el-button {
      width: 100%;
    }
  }
}
</style>
