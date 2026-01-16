<script setup lang="ts">
import { onMounted, ref, watch, computed } from "vue";
import { ElMessage, ElMessageBox } from "element-plus";
import dayjs from "dayjs";
import {
  listGateways,
  createGateway,
  updateGateway,
  deleteGateway,
  type GatewayDto
} from "@/api/ems/gateways";
import EmsProjectSelector from "@/components/EmsProjectSelector/index.vue";
import { useRenderIcon } from "@/components/ReIcon/src/hooks";

defineOptions({
  name: "EmsGateways"
});

const loading = ref(false);
const items = ref<GatewayDto[]>([]);
const error = ref("");
const projectId = ref("");

const dialogVisible = ref(false);
const isEdit = ref(false);
const currentId = ref("");

// 协议类型选项
const protocolOptions = [
  { label: "MQTT", value: "mqtt" },
  { label: "Modbus TCP", value: "modbus_tcp" },
  { label: "TCP Server", value: "tcp_server" },
  { label: "TCP Client", value: "tcp_client" }
];

const form = ref({
  name: "",
  status: "online",
  protocolType: "mqtt",
  // Modbus TCP 配置
  modbusHost: "",
  modbusPort: 502,
  modbusPollInterval: 1000,
  // TCP Server 配置
  tcpServerPort: 9000,
  // TCP Client 配置
  tcpClientHost: "",
  tcpClientPort: 8080
});

// 根据协议类型生成配置 JSON
const buildProtocolConfig = () => {
  switch (form.value.protocolType) {
    case "modbus_tcp":
      return JSON.stringify({
        host: form.value.modbusHost,
        port: form.value.modbusPort,
        poll_interval_ms: form.value.modbusPollInterval
      });
    case "tcp_server":
      return JSON.stringify({
        listen_port: form.value.tcpServerPort,
        frame_delimiter: "\n"
      });
    case "tcp_client":
      return JSON.stringify({
        host: form.value.tcpClientHost,
        port: form.value.tcpClientPort,
        poll_interval_ms: 1000
      });
    case "mqtt":
    default:
      return undefined;
  }
};

// 解析协议配置 JSON
const parseProtocolConfig = (protocolType: string, configStr?: string) => {
  if (!configStr) return;
  try {
    const config = JSON.parse(configStr);
    switch (protocolType) {
      case "modbus_tcp":
        form.value.modbusHost = config.host || "";
        form.value.modbusPort = config.port || 502;
        form.value.modbusPollInterval = config.poll_interval_ms || 1000;
        break;
      case "tcp_server":
        form.value.tcpServerPort = config.listen_port || 9000;
        break;
      case "tcp_client":
        form.value.tcpClientHost = config.host || "";
        form.value.tcpClientPort = config.port || 8080;
        break;
    }
  } catch {
    // 忽略解析错误
  }
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
    const res = await listGateways(pid);
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
  form.value = {
    name: "",
    status: "online",
    protocolType: "mqtt",
    modbusHost: "",
    modbusPort: 502,
    modbusPollInterval: 1000,
    tcpServerPort: 9000,
    tcpClientHost: "",
    tcpClientPort: 8080
  };
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

const handleEdit = (row: GatewayDto) => {
  isEdit.value = true;
  currentId.value = row.gatewayId;
  resetForm();
  form.value.name = row.name;
  form.value.status = row.status;
  form.value.protocolType = row.protocolType || "mqtt";
  parseProtocolConfig(row.protocolType, row.protocolConfig);
  dialogVisible.value = true;
};

const handleDelete = (row: GatewayDto) => {
  ElMessageBox.confirm(`确认删除网关 "${row.name}" 吗？这可能会影响下属设备的连接。`, "警告", {
    confirmButtonText: "确定",
    cancelButtonText: "取消",
    type: "warning"
  }).then(async () => {
    loading.value = true;
    try {
      const res = await deleteGateway(projectId.value, row.gatewayId);
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

  if (!name) {
    ElMessage.warning("请输入网关名称");
    return;
  }

  // Modbus TCP 需要验证主机地址
  if (form.value.protocolType === "modbus_tcp" && !form.value.modbusHost.trim()) {
    ElMessage.warning("请输入 Modbus 服务器地址");
    return;
  }

  // TCP Client 需要验证主机地址
  if (form.value.protocolType === "tcp_client" && !form.value.tcpClientHost.trim()) {
    ElMessage.warning("请输入 TCP 服务器地址");
    return;
  }

  loading.value = true;
  try {
    const status = form.value.status.trim();
    const protocolConfig = buildProtocolConfig();
    
    let res;
    if (isEdit.value) {
      res = await updateGateway(pid, currentId.value, {
        name,
        status: status || undefined,
        protocolType: form.value.protocolType,
        protocolConfig
      });
    } else {
      res = await createGateway(pid, {
        name,
        status: status || undefined,
        protocolType: form.value.protocolType,
        protocolConfig
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

// 获取协议类型显示标签
const getProtocolLabel = (type: string) => {
  const opt = protocolOptions.find(o => o.value === type);
  return opt?.label || type || "MQTT";
};

watch(
  () => projectId.value,
  async val => {
    if (val) {
      await fetchList();
    } else {
      items.value = [];
    }
  }
);

onMounted(() => {
  if (projectId.value) {
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
            <div class="text-base font-medium">网关管理</div>
            <div class="text-xs text-gray-400">管理项目内的物理网关及其连接状态和协议配置</div>
          </div>
          <div class="flex items-center gap-3">
            <EmsProjectSelector v-model="projectId" />
            <el-button
              type="primary"
              :icon="useRenderIcon('ri:add-circle-line')"
              @click="handleAdd"
            >
              添加网关
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
        <el-table-column prop="name" label="网关名称" min-width="150" show-overflow-tooltip>
          <template #default="{ row }">
            <span class="font-bold text-gray-700 dark:text-gray-200">{{ row.name }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="protocolType" label="协议类型" width="130">
          <template #default="{ row }">
            <el-tag size="small" :type="row.protocolType === 'mqtt' ? 'primary' : 'warning'" effect="plain">
              {{ getProtocolLabel(row.protocolType) }}
            </el-tag>
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
        <el-table-column prop="status" label="配置状态" width="100">
          <template #default="{ row }">
            <el-tag size="small" :type="row.status === 'online' ? 'success' : 'info'" effect="plain">
              {{ row.status }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="gatewayId" label="网关 ID" min-width="160">
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
      :title="isEdit ? '编辑网关' : '添加网关'"
      width="520px"
      append-to-body
      destroy-on-close
    >
      <el-form :model="form" label-position="top">
        <el-form-item label="网关名称" required>
          <el-input v-model="form.name" placeholder="例如：1号楼中心网关" />
        </el-form-item>
        
        <el-form-item label="协议类型" required>
          <el-select v-model="form.protocolType" class="w-full">
            <el-option
              v-for="opt in protocolOptions"
              :key="opt.value"
              :label="opt.label"
              :value="opt.value"
            />
          </el-select>
        </el-form-item>

        <!-- Modbus TCP 配置 -->
        <template v-if="form.protocolType === 'modbus_tcp'">
          <el-divider content-position="left">Modbus TCP 配置</el-divider>
          <el-row :gutter="12">
            <el-col :span="16">
              <el-form-item label="服务器地址" required>
                <el-input v-model="form.modbusHost" placeholder="192.168.1.100" />
              </el-form-item>
            </el-col>
            <el-col :span="8">
              <el-form-item label="端口">
                <el-input-number v-model="form.modbusPort" :min="1" :max="65535" />
              </el-form-item>
            </el-col>
          </el-row>
          <el-form-item label="轮询间隔 (ms)">
            <el-input-number v-model="form.modbusPollInterval" :min="100" :max="60000" :step="100" />
          </el-form-item>
        </template>

        <!-- TCP Server 配置 -->
        <template v-if="form.protocolType === 'tcp_server'">
          <el-divider content-position="left">TCP Server 配置</el-divider>
          <el-form-item label="监听端口" required>
            <el-input-number v-model="form.tcpServerPort" :min="1" :max="65535" />
          </el-form-item>
        </template>

        <!-- TCP Client 配置 -->
        <template v-if="form.protocolType === 'tcp_client'">
          <el-divider content-position="left">TCP Client 配置</el-divider>
          <el-row :gutter="12">
            <el-col :span="16">
              <el-form-item label="服务器地址" required>
                <el-input v-model="form.tcpClientHost" placeholder="192.168.1.100" />
              </el-form-item>
            </el-col>
            <el-col :span="8">
              <el-form-item label="端口">
                <el-input-number v-model="form.tcpClientPort" :min="1" :max="65535" />
              </el-form-item>
            </el-col>
          </el-row>
        </template>

        <el-form-item label="配置状态">
          <el-select v-model="form.status" class="w-full">
            <el-option label="Online" value="online" />
            <el-option label="Offline" value="offline" />
          </el-select>
        </el-form-item>
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
