<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { ElMessage, ElMessageBox } from "element-plus";
import dayjs from "dayjs";
import {
  listDevices,
  createDevice,
  updateDevice,
  deleteDevice,
  type DeviceDto
} from "@/api/ems/devices";
import { listGateways, type GatewayDto } from "@/api/ems/gateways";
import EmsProjectSelector from "@/components/EmsProjectSelector/index.vue";
import { useRenderIcon } from "@/components/ReIcon/src/hooks";

defineOptions({
  name: "EmsDevices"
});

const loading = ref(false);
const items = ref<DeviceDto[]>([]);
const error = ref("");
const projectId = ref("");
const gateways = ref<GatewayDto[]>([]);

const dialogVisible = ref(false);
const isEdit = ref(false);
const currentId = ref("");
const form = ref({
  gatewayId: "",
  name: "",
  model: "",
  // Modbus 从站地址配置
  slaveId: 1
});

// 获取当前选中网关的协议类型
const selectedGateway = computed(() => 
  gateways.value.find(g => g.gatewayId === form.value.gatewayId)
);

const isModbusGateway = computed(() => 
  selectedGateway.value?.protocolType === "modbus_tcp"
);

const gatewayOptions = computed(() =>
  gateways.value.map(item => ({
    label: `${item.name} (${getProtocolLabel(item.protocolType)})`,
    value: item.gatewayId
  }))
);

const getProtocolLabel = (type: string) => {
  const labels: Record<string, string> = {
    mqtt: "MQTT",
    modbus_tcp: "Modbus TCP",
    tcp_server: "TCP Server",
    tcp_client: "TCP Client"
  };
  return labels[type] || type || "MQTT";
};

// 构建地址配置 JSON
const buildAddressConfig = () => {
  if (isModbusGateway.value) {
    return JSON.stringify({ slave_id: form.value.slaveId });
  }
  return undefined;
};

// 解析地址配置
const parseAddressConfig = (configStr?: string) => {
  if (!configStr) return;
  try {
    const config = JSON.parse(configStr);
    form.value.slaveId = config.slave_id || 1;
  } catch {}
};

const refreshGateways = async () => {
  const pid = projectId.value.trim();
  gateways.value = [];
  if (!pid) return;
  try {
    const res = await listGateways(pid);
    if (!res.success) return;
    gateways.value = res.data ?? [];
  } catch {}
};

const fetchList = async () => {
  error.value = "";
  const pid = projectId.value.trim();
  if (!pid) {
    error.value = "请选择项目";
    items.value = [];
    return;
  }
  loading.value = true;
  try {
    const res = await listDevices(pid);
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

const resetForm = () => {
  form.value = { gatewayId: "", name: "", model: "", slaveId: 1 };
};

const handleAdd = () => {
  if (!projectId.value) {
    ElMessage.warning("请先选择项目");
    return;
  }
  isEdit.value = false;
  currentId.value = "";
  resetForm();
  dialogVisible.value = true;
};

const handleEdit = (row: DeviceDto) => {
  isEdit.value = true;
  currentId.value = row.deviceId;
  resetForm();
  form.value.gatewayId = row.gatewayId;
  form.value.name = row.name;
  form.value.model = row.model || "";
  parseAddressConfig(row.addressConfig);
  dialogVisible.value = true;
};

const handleDelete = (row: DeviceDto) => {
  ElMessageBox.confirm(`确认删除设备 "${row.name}" 吗？`, "警告", {
    confirmButtonText: "确定",
    cancelButtonText: "取消",
    type: "warning"
  }).then(async () => {
    loading.value = true;
    try {
      const res = await deleteDevice(projectId.value, row.deviceId);
      if (res.success) {
        ElMessage.success("删除成功");
        await fetchList();
      } else {
        ElMessage.error(res.error?.message ?? "删除失败");
      }
    } catch {
      ElMessage.error("请求失败");
    } finally {
      loading.value = false;
    }
  });
};

const submit = async () => {
  const pid = projectId.value.trim();
  const name = form.value.name.trim();
  const gatewayId = form.value.gatewayId.trim();

  if (!gatewayId) {
    ElMessage.warning("请选择网关");
    return;
  }
  if (!name) {
    ElMessage.warning("请输入设备名称");
    return;
  }

  loading.value = true;
  try {
    const model = form.value.model.trim();
    const addressConfig = buildAddressConfig();
    
    let res;
    if (isEdit.value) {
      res = await updateDevice(pid, currentId.value, {
        gatewayId,
        name,
        model: model || undefined,
        addressConfig
      });
    } else {
      res = await createDevice(pid, {
        gatewayId,
        name,
        model: model || undefined,
        addressConfig
      });
    }

    if (!res.success) {
      ElMessage.error(res.error?.message ?? (isEdit.value ? "更新失败" : "创建失败"));
      return;
    }
    ElMessage.success(isEdit.value ? "更新成功" : "创建成功");
    dialogVisible.value = false;
    await fetchList();
  } catch (err) {
    ElMessage.error("请求失败");
  } finally {
    loading.value = false;
  }
};

// 获取设备地址配置中的从站 ID 用于显示
const getSlaveId = (addressConfig?: string) => {
  if (!addressConfig) return "-";
  try {
    const config = JSON.parse(addressConfig);
    return config.slave_id ?? "-";
  } catch {
    return "-";
  }
};

watch(
  () => projectId.value,
  async val => {
    if (val) {
      form.value.gatewayId = "";
      await refreshGateways();
      await fetchList();
    } else {
      items.value = [];
      gateways.value = [];
    }
  }
);

onMounted(() => {
  if (projectId.value) {
    refreshGateways();
    fetchList();
  }
});
</script>

<template>
  <div class="ems-page animate-fade-in-up">
    <el-card shadow="never" class="mb-4!">
      <template #header>
        <div class="flex items-center justify-between flex-wrap gap-2">
          <div>
            <div class="text-base font-medium">设备管理</div>
            <div class="text-xs text-gray-400">管理项目内的物理设备及其在线状态和协议地址</div>
          </div>
          <div class="flex items-center gap-3">
            <EmsProjectSelector v-model="projectId" />
            <el-button
              type="primary"
              :icon="useRenderIcon('ri:add-circle-line')"
              @click="handleAdd"
            >
              添加设备
            </el-button>
          </div>
        </div>
      </template>

      <div v-if="error" class="mb-4">
        <el-alert type="error" :closable="false" show-icon>{{ error }}</el-alert>
      </div>

      <el-table
        v-loading="loading"
        :data="items"
        row-class-name="animate-fade-in-up"
      >
        <el-table-column prop="name" label="设备名称" min-width="150" show-overflow-tooltip>
          <template #default="{ row }">
            <span class="font-bold text-gray-700 dark:text-gray-200">{{ row.name }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="addressConfig" label="从站地址" width="100" align="center">
          <template #default="{ row }">
            <el-tag v-if="row.addressConfig" size="small" type="info">
              #{{ getSlaveId(row.addressConfig) }}
            </el-tag>
            <span v-else class="text-gray-400">-</span>
          </template>
        </el-table-column>
        <el-table-column prop="online" label="状态" width="100" align="center">
          <template #default="{ row }">
            <div class="flex items-center justify-center gap-2">
              <span
                class="status-dot"
                :class="{ 'is-online': row.online }"
              />
              <span :class="row.online ? 'text-green-500' : 'text-gray-400'">
                {{ row.online ? '在线' : '离线' }}
              </span>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="model" label="型号" min-width="100" />
        <el-table-column prop="deviceId" label="设备 ID" min-width="160">
          <template #default="{ row }">
            <code class="text-xs opacity-70">{{ row.deviceId }}</code>
          </template>
        </el-table-column>
        <el-table-column prop="gatewayId" label="所属网关" min-width="160">
          <template #default="{ row }">
            <code class="text-xs opacity-70">{{ row.gatewayId }}</code>
          </template>
        </el-table-column>
        <el-table-column prop="lastSeenAtMs" label="最后在线" width="160">
          <template #default="{ row }">
            <span class="text-xs text-gray-500">
              {{ row.lastSeenAtMs ? dayjs(row.lastSeenAtMs).format('YYYY-MM-DD HH:mm:ss') : '-' }}
            </span>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="120" fixed="right" align="center">
          <template #default="{ row }">
            <el-button
              link
              type="primary"
              :icon="useRenderIcon('ep:edit-pen')"
              @click="handleEdit(row)"
            />
            <el-button
              link
              type="danger"
              :icon="useRenderIcon('ep:delete')"
              @click="handleDelete(row)"
            />
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-dialog
      v-model="dialogVisible"
      :title="isEdit ? '编辑设备' : '添加设备'"
      width="520px"
      append-to-body
      destroy-on-close
    >
      <el-form :model="form" label-position="top">
        <el-form-item label="所属网关" required>
          <el-select
            v-model="form.gatewayId"
            class="w-full"
            filterable
            placeholder="选择网关"
          >
            <el-option
              v-for="opt in gatewayOptions"
              :key="opt.value"
              :label="opt.label"
              :value="opt.value"
            />
          </el-select>
          <div class="mt-1 text-xs text-gray-400">
            仅显示当前项目下的运行网关
          </div>
        </el-form-item>
        
        <el-form-item label="设备名称" required>
          <el-input v-model="form.name" placeholder="例如：1号变压器" />
        </el-form-item>
        
        <el-form-item label="设备型号">
          <el-input v-model="form.model" placeholder="可选" />
        </el-form-item>

        <!-- Modbus 从站地址配置 -->
        <template v-if="isModbusGateway">
          <el-divider content-position="left">Modbus 地址配置</el-divider>
          <el-form-item label="从站地址 (Slave ID)" required>
            <el-input-number v-model="form.slaveId" :min="1" :max="247" />
            <div class="mt-1 text-xs text-gray-400">
              Modbus 从站地址范围：1-247
            </div>
          </el-form-item>
        </template>
      </el-form>
      <template #footer>
        <div class="flex justify-end gap-2">
          <el-button @click="dialogVisible = false">取消</el-button>
          <el-button type="primary" :loading="loading" @click="submit">
            {{ isEdit ? '保存' : '创建' }}
          </el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.ems-page {
  padding: var(--space-6);
  max-width: 1600px;
  margin: 0 auto;
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #dcdfe6;
  position: relative;

  &.is-online {
    background: #67c23a;
    box-shadow: 0 0 0 rgba(103, 194, 58, 0.4);
    animation: pulse 2s infinite;
  }
}

@keyframes pulse {
  0% {
    box-shadow: 0 0 0 0 rgba(103, 194, 58, 0.7);
  }
  70% {
    box-shadow: 0 0 0 10px rgba(103, 194, 58, 0);
  }
  100% {
    box-shadow: 0 0 0 0 rgba(103, 194, 58, 0);
  }
}
</style>
