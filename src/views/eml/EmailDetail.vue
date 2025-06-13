<template>
  <div class="email-detail">
    <!-- 返回导航 -->
    <div class="detail-header">
      <el-button @click="goBack" :icon="ArrowLeft">返回列表</el-button>
      <div class="header-actions">
        <el-button
          @click="toggleStar"
          :icon="emailDetail?.isStarred ? StarFilled : Star"
          :class="{ 'star-active': emailDetail?.isStarred }"
          :loading="starLoading"
          :disabled="!emailDetail?.id"
        >
          {{ emailDetail?.isStarred ? '取消星标' : '标记星标' }}
        </el-button>
        <el-button @click="deleteEmail" type="danger" :icon="Delete" :disabled="!emailDetail?.id"> 删除邮件 </el-button>
      </div>
    </div>

    <!-- 加载状态 -->
    <div v-if="loading" class="loading-container">
      <el-skeleton :rows="8" animated />
    </div>

    <!-- 邮件内容 -->
    <div v-else-if="emailDetail?.id" class="email-content">
      <!-- 邮件头信息 -->
      <el-card class="email-header-card">
        <div class="email-meta">
          <h2 class="email-subject">
            {{ emailDetail?.subject || '(无主题)' }}
            <el-icon v-if="emailDetail?.isStarred" class="star-icon">
              <StarFilled />
            </el-icon>
          </h2>

          <el-row :gutter="20" class="meta-info">
            <el-col :span="12">
              <div class="meta-row">
                <label>发件人:</label>
                <span class="sender-info">
                  {{ getEmailDisplayName(emailDetail.sender) }}
                  <el-text size="small" type="info">
                    &lt;{{ extractEmail(emailDetail.sender) }}&gt;
                  </el-text>
                </span>
              </div>

              <div class="meta-row" v-if="emailDetail.recipients?.length">
                <label>收件人:</label>
                <div class="recipients-list">
                  <el-tag
                    v-for="recipient in emailDetail.recipients"
                    :key="recipient"
                    size="small"
                    type="info"
                    class="recipient-tag"
                  >
                    {{ getEmailDisplayName(recipient) }}
                  </el-tag>
                </div>
              </div>

              <div class="meta-row" v-if="emailDetail.ccRecipients?.length">
                <label>抄送:</label>
                <div class="recipients-list">
                  <el-tag
                    v-for="ccRecipient in emailDetail.ccRecipients"
                    :key="ccRecipient"
                    size="small"
                    type="warning"
                    class="recipient-tag"
                  >
                    {{ getEmailDisplayName(ccRecipient) }}
                  </el-tag>
                </div>
              </div>

              <div class="meta-row" v-if="emailDetail.bccRecipients?.length">
                <label>密送:</label>
                <div class="recipients-list">
                  <el-tag
                    v-for="bccRecipient in emailDetail.bccRecipients"
                    :key="bccRecipient"
                    size="small"
                    type="danger"
                    class="recipient-tag"
                  >
                    {{ getEmailDisplayName(bccRecipient) }}
                  </el-tag>
                </div>
              </div>
            </el-col>

            <el-col :span="12">
              <div class="meta-row">
                <label>发送时间:</label>
                <span>{{ formatDateTime(emailDetail.sendDate) }}</span>
              </div>

              <div class="meta-row" v-if="emailDetail.receivedDate">
                <label>接收时间:</label>
                <span>{{ formatDateTime(emailDetail.receivedDate) }}</span>
              </div>

              <div class="meta-row">
                <label>原始路径:</label>
                <el-text class="path-text">{{ emailDetail.originalPath }}</el-text>
              </div>

              <div class="meta-row">
                <label>导入时间:</label>
                <span>{{ formatDateTime(emailDetail.createTime) }}</span>
              </div>

              <div class="meta-row" v-if="emailDetail.messageId">
                <label>邮件ID:</label>
                <el-text size="small" class="message-id">{{ emailDetail.messageId }}</el-text>
              </div>
            </el-col>
          </el-row>
        </div>
      </el-card>

      <!-- 双栏内容显示 -->
      <div class="content-container">
        <el-row :gutter="20" class="content-row">
          <!-- 左栏：原始内容 -->
          <el-col :span="leftCollapsed ? 0 : rightCollapsed ? 24 : 12" v-show="!leftCollapsed">
            <el-card class="content-card">
              <template #header>
                <div class="card-header">
                  <span>原始内容</span>
                  <div class="header-controls">
                    <el-radio-group v-model="contentType" size="small">
                      <el-radio-button label="html" :disabled="!emailDetail.contentHtml">
                        HTML
                      </el-radio-button>
                      <el-radio-button label="text" :disabled="!emailDetail.contentText">
                        纯文本
                      </el-radio-button>
                    </el-radio-group>
                    <el-button
                      @click="leftCollapsed = true"
                      size="small"
                      :icon="ArrowLeft"
                      v-if="!rightCollapsed"
                    />
                    <!-- 当翻译区域被隐藏时，显示打开翻译的按钮 -->
                    <el-button
                      @click="rightCollapsed = false"
                      size="small"
                      :icon="ArrowRight"
                      type="primary"
                      v-if="rightCollapsed"
                    >
                      打开翻译
                    </el-button>
                  </div>
                </div>
              </template>

              <div class="content-display">
                <div
                  v-if="contentType === 'html' && emailDetail.contentHtml"
                  v-html="sanitizeHtml(emailDetail.contentHtml)"
                  class="html-content"
                ></div>
                <pre v-else-if="emailDetail.contentText" class="text-content">{{
                  emailDetail.contentText
                }}</pre>
                <div v-else class="no-content">
                  <el-empty description="无内容" :image-size="80" />
                </div>
              </div>
            </el-card>
          </el-col>

          <!-- 右栏：翻译内容 -->
          <el-col :span="rightCollapsed ? 0 : leftCollapsed ? 24 : 12" v-show="!rightCollapsed">
            <el-card class="content-card translation-card">
              <template #header>
                <div class="card-header">
                  <span>翻译内容</span>
                  <div class="header-controls">
                    <el-button-group size="small">
                      <el-button 
                        @click="toggleTranslation" 
                        :type="translationEnabled ? 'primary' : 'default'"
                        :loading="translating"
                        size="small"
                      >
                        {{ translationEnabled ? '已翻译' : '开始翻译' }}
                      </el-button>
                      <el-button 
                        @click="clearTranslation" 
                        :disabled="!translationEnabled"
                        size="small"
                      >
                        清除
                      </el-button>
                    </el-button-group>
                    <el-button
                      @click="rightCollapsed = true"
                      size="small"
                      :icon="ArrowRight"
                      v-if="!leftCollapsed"
                    />
                  </div>
                </div>
              </template>

              <div class="content-display">
                <!-- 翻译结果显示 -->
                <div v-if="translationEnabled && translatedContent" class="translation-result">
                  <div v-if="contentType === 'html'" v-html="sanitizeHtml(translatedContent)" class="html-content"></div>
                  <pre v-else class="text-content">{{ translatedContent }}</pre>
                </div>
                
                <!-- 翻译中状态 -->
                <div v-else-if="translating" class="translation-loading">
                  <el-skeleton :rows="8" animated />
                  <div class="loading-text">正在翻译中，请稍候...</div>
                </div>
                
                <!-- 未开始翻译状态 -->
                <div v-else class="translation-placeholder">
                  <el-empty description="点击开始翻译按钮进行内容翻译" :image-size="100">
                    <el-button type="primary" @click="toggleTranslation"> 
                      开始翻译 
                    </el-button>
                  </el-empty>
                </div>
              </div>
            </el-card>
          </el-col>

          <!-- 全屏展开控制 -->
          <el-col :span="24" v-show="leftCollapsed && rightCollapsed">
            <el-card class="expand-controls">
              <div class="expand-buttons">
                <el-button @click="expandLeft" :icon="ArrowRight"> 显示原始内容 </el-button>
                <el-button @click="expandRight" :icon="ArrowLeft"> 显示翻译内容 </el-button>
                <el-button @click="resetLayout" :icon="Grid"> 显示双栏 </el-button>
              </div>
            </el-card>
          </el-col>
        </el-row>
      </div>

      <!-- 附件列表 -->
      <el-card v-if="emailDetail.attachments?.length" class="attachments-card">
        <template #header>
          <div class="attachments-header">
            <span>附件列表 ({{ emailDetail.attachments.length }})</span>
            <el-button size="small" @click="downloadAllAttachments" :loading="downloadingAll">
              全部下载
            </el-button>
          </div>
        </template>

        <el-table :data="emailDetail.attachments" stripe>
          <el-table-column label="文件名" min-width="200">
            <template #default="{ row }">
              <div class="attachment-name">
                <el-icon class="file-icon">
                  <Document />
                </el-icon>
                {{ row.filename || row.fileName }}
              </div>
            </template>
          </el-table-column>

          <el-table-column prop="contentType" label="文件类型" width="150" />

          <el-table-column label="文件大小" width="120">
            <template #default="{ row }">
              {{ formatFileSize(row.fileSize) }}
            </template>
          </el-table-column>

          <el-table-column label="操作" width="100" align="center">
            <template #default="{ row }">
              <el-button
                @click="downloadAttachment(row)"
                :icon="Download"
                type="primary"
                size="small"
                :loading="row.downloading"
              >
                下载
              </el-button>
            </template>
          </el-table-column>
        </el-table>
      </el-card>
    </div>

    <!-- 错误状态 -->
    <div v-else class="error-container">
      <el-result icon="warning" title="邮件不存在" sub-title="请检查邮件ID是否正确">
        <template #extra>
          <el-button type="primary" @click="goBack">返回列表</el-button>
        </template>
      </el-result>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  ArrowLeft,
  ArrowRight,
  Star,
  StarFilled,
  Delete,
  Download,
  Document,
  Grid
} from '@element-plus/icons-vue'

import type { EmailMessage, EmailAttachment } from '@/types/eml/email'
import {
  getEmailMessage,
  toggleEmailStar,
  deleteEmailMessage,
  downloadAttachment as downloadAttachmentApi
} from '@/api/eml/email'
import {
  formatDateTime,
  formatFileSize,
  sanitizeHtml,
  getEmailDisplayName,
  extractEmail,
  downloadAttachmentFile
} from '@/utils/eml'

// Router
const route = useRoute()
const router = useRouter()

// Reactive data
const loading = ref(true)
const starLoading = ref(false)
const downloadingAll = ref(false)
const emailDetail = ref<EmailMessage>({
  id: 0,
  messageId: '',
  importBatchId: 0,
  subject: '',
  sender: '',
  recipients: [],
  ccRecipients: [],
  bccRecipients: [],
  contentText: '',
  contentHtml: '',
  originalPath: '',
  isStarred: false,
  attachmentCount: 0,
  attachments: [],
  sendDate: '',
  receivedDate: '',
  createTime: ''
} as EmailMessage)
const contentType = ref<'html' | 'text'>('html')
const leftCollapsed = ref(false)
const rightCollapsed = ref(false) // 确保翻译区域默认显示

// 翻译功能
const translationEnabled = ref(false)
const translating = ref(false)
const translatedContent = ref('')

// Methods
const getEmailDetail = async () => {
  try {
    loading.value = true
    const emailId = Number(route.params.id)

    if (!emailId) {
      throw new Error('邮件ID无效')
    }

    const response = await getEmailMessage(emailId)
    console.log('API返回原始数据 (邮件详情):', response)

    // 安全地获取数据 - 处理不同的响应格式
    const data = response.data || response
    if (!data || !data.id) {
      console.error('API返回数据为空或无效:', response)
      throw new Error('邮件数据不存在')
    }

    emailDetail.value = data

    // 安全地设置默认内容类型
    if (data.contentHtml) {
      contentType.value = 'html'
    } else if (data.contentText) {
      contentType.value = 'text'
    }

    console.log('邮件详情加载成功:', data.id, data.subject)
  } catch (error: any) {
    console.error('Get email detail error:', error)
    console.error('错误详情:', error.message, error.stack)
    ElMessage.error('获取邮件详情失败：' + (error.message || '未知错误'))
    
    // 重置为默认状态
    emailDetail.value = {
      id: 0,
      messageId: '',
      importBatchId: 0,
      subject: '',
      sender: '',
      recipients: [],
      ccRecipients: [],
      bccRecipients: [],
      contentText: '',
      contentHtml: '',
      originalPath: '',
      isStarred: false,
      attachmentCount: 0,
      attachments: [],
      sendDate: '',
      receivedDate: '',
      createTime: ''
    } as EmailMessage
  } finally {
    loading.value = false
  }
}

const toggleStar = async () => {
  try {
    starLoading.value = true
    await toggleEmailStar(emailDetail.value.id)
    emailDetail.value.isStarred = !emailDetail.value.isStarred
    ElMessage.success(emailDetail.value.isStarred ? '已标记星标' : '已取消星标')
  } catch (error: any) {
    console.error('Toggle star error:', error)
    ElMessage.error('操作失败：' + (error.message || '未知错误'))
  } finally {
    starLoading.value = false
  }
}

const deleteEmail = async () => {
  try {
    await ElMessageBox.confirm(
      `确定要删除邮件"${emailDetail.value.subject || '(无主题)'}"吗？`,
      '删除确认',
      {
        type: 'warning',
        confirmButtonText: '确定删除',
        cancelButtonText: '取消'
      }
    )

    await deleteEmailMessage(emailDetail.value.id)
    ElMessage.success('删除成功')
    goBack()
  } catch (error: any) {
    if (error !== 'cancel') {
      console.error('Delete email error:', error)
      ElMessage.error('删除失败：' + (error.message || '未知错误'))
    }
  }
}

const downloadAttachment = async (attachment: EmailAttachment & { downloading?: boolean }) => {
  try {
    attachment.downloading = true
    const blob = await downloadAttachmentApi(attachment.id)
    downloadAttachmentFile(blob, attachment.filename || attachment.fileName)
    ElMessage.success('下载成功')
  } catch (error: any) {
    console.error('Download attachment error:', error)
    ElMessage.error('下载失败：' + (error.message || '未知错误'))
  } finally {
    attachment.downloading = false
  }
}

const downloadAllAttachments = async () => {
  if (!emailDetail.value.attachments?.length) return

  try {
    downloadingAll.value = true

    for (const attachment of emailDetail.value.attachments) {
      await downloadAttachment(attachment)
    }

    ElMessage.success('全部下载完成')
  } catch (error: any) {
    console.error('Download all attachments error:', error)
    ElMessage.error('批量下载失败：' + (error.message || '未知错误'))
  } finally {
    downloadingAll.value = false
  }
}

const expandLeft = () => {
  leftCollapsed.value = false
  rightCollapsed.value = true
}

const expandRight = () => {
  leftCollapsed.value = true
  rightCollapsed.value = false
}

const resetLayout = () => {
  leftCollapsed.value = false
  rightCollapsed.value = false
}

// 翻译相关方法
const toggleTranslation = async () => {
  if (translationEnabled.value) {
    // 如果已翻译，直接返回
    return
  }
  
  if (!emailDetail.value?.contentText && !emailDetail.value?.contentHtml) {
    ElMessage.warning('没有可翻译的内容')
    return
  }
  
  translating.value = true
  
  try {
    // 模拟翻译过程
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    // 这里后续可以集成真实的翻译API
    const originalContent = contentType.value === 'html' 
      ? emailDetail.value?.contentHtml 
      : emailDetail.value?.contentText
    
    // 简单的模拟翻译（实际应该调用翻译服务）
    translatedContent.value = `[翻译结果] ${originalContent}`
    translationEnabled.value = true
    
    ElMessage.success('翻译完成')
  } catch (error) {
    console.error('翻译失败:', error)
    ElMessage.error('翻译失败，请重试')
  } finally {
    translating.value = false
  }
}

const clearTranslation = () => {
  translatedContent.value = ''
  translationEnabled.value = false
  ElMessage.success('已清除翻译内容')
}

const goBack = () => {
  router.push({ name: 'EmailManagement' })
}

// Lifecycle
onMounted(() => {
  getEmailDetail()
})
</script>

<style scoped lang="scss">
.email-detail {
  padding: 20px;
  background-color: var(--el-bg-color);
  min-height: calc(100vh - 60px);

  .detail-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;

    .header-actions {
      display: flex;
      gap: 12px;
    }

    .star-active {
      color: #f39c12 !important;

      &:hover {
        color: #e67e22 !important;
      }
    }
  }

  .loading-container {
    padding: 20px;
  }

  .email-content {
    .email-header-card {
      margin-bottom: 20px;

      .email-subject {
        margin: 0 0 20px 0;
        color: var(--el-text-color-primary);
        display: flex;
        align-items: center;
        gap: 8px;

        .star-icon {
          color: #f39c12;
          font-size: 20px;
        }
      }

      .meta-info {
        .meta-row {
          display: flex;
          margin-bottom: 12px;
          align-items: flex-start;

          label {
            min-width: 80px;
            font-weight: 600;
            color: var(--el-text-color-primary);
            flex-shrink: 0;
          }

          span,
          div {
            flex: 1;
            word-break: break-all;
          }

          .sender-info {
            display: flex;
            flex-direction: column;
            gap: 4px;
          }

          .recipients-list {
            display: flex;
            flex-wrap: wrap;
            gap: 4px;

            .recipient-tag {
              font-size: 12px;
            }
          }

          .path-text {
            font-family: 'Courier New', monospace;
            font-size: 12px;
            color: var(--el-text-color-secondary);
          }

          .message-id {
            font-family: 'Courier New', monospace;
            color: var(--el-text-color-secondary);
          }
        }
      }
    }

    .content-container {
      margin-bottom: 20px;

      .content-row {
        min-height: 400px;
      }

              .content-card {
          height: 700px;

          .card-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
          }

          .content-display {
            height: 600px; /* 固定高度确保滚动 */
            overflow-y: auto;
            overflow-x: hidden;
            border: 1px solid #eee;
            border-radius: 8px;
            background: #fafafa;

          .html-content {
            word-break: break-word;
            line-height: 1.6;
            padding: 16px;
            min-height: 800px; /* 最小高度确保能滚动 */

            :deep(img) {
              max-width: 100%;
              height: auto;
            }

            :deep(table) {
              max-width: 100%;
              border-collapse: collapse;
            }

            :deep(a) {
              color: var(--el-color-primary);
            }
          }

          .text-content {
            white-space: pre-wrap;
            word-break: break-word;
            font-family: 'Courier New', monospace;
            line-height: 1.5;
            margin: 0;
            padding: 16px;
            min-height: 800px; /* 最小高度确保能滚动 */
            color: var(--el-text-color-regular);
          }

          .no-content {
            display: flex;
            align-items: center;
            justify-content: center;
            height: 100%;
          }
        }
      }

      .translation-card {
        .translation-placeholder {
          display: flex;
          align-items: center;
          justify-content: center;
          height: 600px; /* 固定高度与其他区域保持一致 */
        }

        .translation-result {
          height: 600px; /* 固定高度确保滚动 */
          overflow-y: auto;

          .html-content {
            word-break: break-word;
            line-height: 1.6;
            padding: 16px;
            min-height: 800px; /* 最小高度确保能滚动 */

            :deep(img) {
              max-width: 100%;
              height: auto;
            }

            :deep(table) {
              max-width: 100%;
              border-collapse: collapse;
            }

            :deep(a) {
              color: var(--el-color-primary);
            }
          }

          .text-content {
            white-space: pre-wrap;
            word-break: break-word;
            font-family: 'Courier New', monospace;
            line-height: 1.5;
            margin: 0;
            padding: 16px;
            min-height: 800px; /* 最小高度确保能滚动 */
            color: var(--el-text-color-regular);
          }
        }

        .translation-loading {
          text-align: center;
          padding: 20px;
          height: 600px; /* 固定高度与其他区域保持一致 */
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;

          .loading-text {
            margin-top: 16px;
            color: #666;
            font-size: 14px;
          }
        }
      }

      .expand-controls {
        text-align: center;

        .expand-buttons {
          padding: 40px;
          display: flex;
          gap: 16px;
          justify-content: center;
        }
      }
    }

    .attachments-card {
      .attachments-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
      }

      .attachment-name {
        display: flex;
        align-items: center;
        gap: 8px;

        .file-icon {
          color: var(--el-color-primary);
          font-size: 16px;
        }
      }
    }
  }

  .error-container {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 400px;
  }

  // 响应式处理
  @media (max-width: 768px) {
    padding: 16px;

    .detail-header {
      flex-direction: column;
      gap: 16px;
      align-items: stretch;

      .header-actions {
        justify-content: center;
      }
    }

    .email-content {
      .content-container {
        .content-card {
          height: 400px;
        }
      }

      .email-header-card {
        .meta-info {
          .meta-row {
            flex-direction: column;
            gap: 4px;

            label {
              min-width: auto;
            }
          }
        }
      }
    }
  }
}
</style>
