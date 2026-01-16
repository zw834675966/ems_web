<script setup lang="ts">
import { ref } from "vue";
import {
  listCommands,
  createCommand,
  listCommandReceipts,
  type CommandDto,
  type CommandReceiptDto
} from "@/api/ems/commands";
import EmsProjectSelector from "@/components/EmsProjectSelector/index.vue";

defineOptions({
  name: "EmsCommands"
});

const loading = ref(false);
const error = ref("");
const projectId = ref("");
const listLimit = ref(100);
const items = ref<CommandDto[]>([]);

const form = ref({
  target: "demo-target",
  payloadJson: '{"action":"set","value":42}'
});

const receiptsLoading = ref(false);
const receiptError = ref("");
const selectedCommandId = ref("");
const receipts = ref<CommandReceiptDto[]>([]);

const fetchList = async () => {
  error.value = "";
  items.value = [];
  const pid = projectId.value.trim();
  if (!pid) {
    error.value = "请选择项目";
    return;
  }
  loading.value = true;
  try {
    const res = await listCommands(pid, Number(listLimit.value) || 100);
    if (!res.success) {
      error.value = res.error?.message ?? "加载失败";
      return;
    }
    items.value = res.data ?? [];
  } catch (err) {
    error.value = "请求失败";
  } finally {
    loading.value = false;
  }
};

const submit = async () => {
  error.value = "";
  const pid = projectId.value.trim();
  if (!pid) {
    error.value = "请选择项目";
    return;
  }
  const target = form.value.target.trim();
  if (!target) {
    error.value = "请输入 target";
    return;
  }
  let payload: unknown;
  try {
    payload = JSON.parse(form.value.payloadJson);
  } catch (err) {
    error.value = "payload 不是合法 JSON";
    return;
  }
  loading.value = true;
  try {
    const res = await createCommand(pid, { target, payload });
    if (!res.success) {
      error.value = res.error?.message ?? "下发失败";
      return;
    }
    selectedCommandId.value = res.data?.commandId ?? "";
    await fetchList();
  } catch (err) {
    error.value = "请求失败";
  } finally {
    loading.value = false;
  }
};

const fetchReceipts = async (commandId?: string) => {
  receiptError.value = "";
  receipts.value = [];
  const pid = projectId.value.trim();
  const cid = (commandId ?? selectedCommandId.value).trim();
  if (!pid) {
    receiptError.value = "请选择项目";
    return;
  }
  if (!cid) {
    receiptError.value = "请输入 commandId";
    return;
  }
  receiptsLoading.value = true;
  try {
    const res = await listCommandReceipts(pid, cid);
    if (!res.success) {
      receiptError.value = res.error?.message ?? "加载失败";
      return;
    }
    receipts.value = res.data ?? [];
  } catch (err) {
    receiptError.value = "请求失败";
  } finally {
    receiptsLoading.value = false;
  }
};
</script>

<template>
  <div class="ems-page">
    <el-card shadow="never" class="mb-4!">
      <template #header>
        <div class="flex items-center justify-between flex-wrap gap-2">
          <div>
            <div class="text-base font-medium">控制命令</div>
            <div class="text-xs text-gray-500">下发命令与查询回执</div>
          </div>
          <EmsProjectSelector v-model="projectId" @change="fetchList" />
        </div>
      </template>
      <el-form label-width="120px">
        <el-form-item label="limit">
          <el-input v-model="listLimit" placeholder="默认 100" />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :loading="loading" @click="fetchList">
            加载列表
          </el-button>
          <span v-if="error" class="ml-2 text-red-500">{{ error }}</span>
        </el-form-item>
      </el-form>
      <el-table :data="items" border>
        <el-table-column prop="commandId" label="commandId" min-width="240" />
        <el-table-column prop="target" label="target" min-width="160" />
        <el-table-column prop="status" label="status" min-width="120" />
        <el-table-column prop="issuedBy" label="issuedBy" min-width="120" />
        <el-table-column prop="issuedAtMs" label="issuedAtMs" min-width="160" />
        <el-table-column label="操作" min-width="160">
          <template #default="{ row }">
            <el-button size="small" @click="fetchReceipts(row.commandId)">
              查看回执
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-card shadow="never" class="mb-4!">
      <template #header>
        <div>下发命令</div>
      </template>
      <el-form :model="form" label-width="120px">
        <el-form-item label="target">
          <el-input v-model="form.target" placeholder="demo-target" />
        </el-form-item>
        <el-form-item label="payload(JSON)">
          <el-input
            v-model="form.payloadJson"
            type="textarea"
            :rows="4"
            placeholder='{"action":"set","value":42}'
          />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :loading="loading" @click="submit">
            下发
          </el-button>
          <span v-if="error" class="ml-2 text-red-500">{{ error }}</span>
        </el-form-item>
      </el-form>
      <div v-if="selectedCommandId" class="text-gray-600">
        最近 commandId: {{ selectedCommandId }}
      </div>
    </el-card>

    <el-card shadow="never">
      <template #header>
        <div>命令回执</div>
      </template>
      <div class="flex items-center gap-2 mb-2">
        <el-input
          v-model="selectedCommandId"
          placeholder="commandId（可选，默认使用最近一次下发）"
        />
        <el-button :loading="receiptsLoading" @click="fetchReceipts()">
          刷新
        </el-button>
        <span v-if="receiptError" class="text-red-500">{{ receiptError }}</span>
      </div>
      <el-table :data="receipts" border>
        <el-table-column prop="receiptId" label="receiptId" min-width="240" />
        <el-table-column prop="status" label="status" min-width="120" />
        <el-table-column prop="message" label="message" min-width="160" />
        <el-table-column prop="tsMs" label="tsMs" min-width="160" />
      </el-table>
    </el-card>
  </div>
</template>

<style scoped>
.ems-page {
  padding: var(--space-6);
  max-width: 1600px;
  margin: 0 auto;
}
</style>
