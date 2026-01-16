<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { ElMessage, ElMessageBox } from "element-plus";
import {
  listPoints,
  createPoint,
  updatePoint,
  deletePoint,
  type PointDto
} from "@/api/ems/points";
import { listDevices, type DeviceDto } from "@/api/ems/devices";
import EmsProjectSelector from "@/components/EmsProjectSelector/index.vue";
import { useRenderIcon } from "@/components/ReIcon/src/hooks";

defineOptions({
  name: "EmsPoints"
});

const loading = ref(false);
const items = ref<PointDto[]>([]);
const error = ref("");
const projectId = ref("");
const devices = ref<DeviceDto[]>([]);

const dialogVisible = ref(false);
const isEdit = ref(false);
const currentId = ref("");
const form = ref({
  deviceId: "",
  key: "",
  dataType: "float",
  unit: ""
});

const deviceOptions = computed(() =>
  devices.value.map(item => ({
    label: `${item.name} (${item.deviceId})`,
    value: item.deviceId
  }))
);

const refreshDevices = async () => {
  const pid = projectId.value.trim();
  devices.value = [];
  if (!pid) return;
  try {
    const res = await listDevices(pid);
    if (!res.success) return;
    devices.value = res.data ?? [];
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
    const res = await listPoints(pid);
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

const handleAdd = () => {
  if (!projectId.value) {
    ElMessage.warning("请先选择项目");
    return;
  }
  isEdit.value = false;
  currentId.value = "";
  form.value = { deviceId: "", key: "", dataType: "float", unit: "" };
  dialogVisible.value = true;
};

const handleEdit = (row: PointDto) => {
  isEdit.value = true;
  currentId.value = row.pointId;
  form.value = {
    deviceId: row.deviceId,
    key: row.key,
    dataType: row.dataType,
    unit: row.unit || ""
  };
  dialogVisible.value = true;
};

const handleDelete = (row: PointDto) => {
  ElMessageBox.confirm(`确认删除点位 "${row.key}" 吗？`, "警告", {
    confirmButtonText: "确定",
    cancelButtonText: "取消",
    type: "warning"
  }).then(async () => {
    loading.value = true;
    try {
      const res = await deletePoint(projectId.value, row.pointId);
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
  const deviceId = form.value.deviceId.trim();
  const key = form.value.key.trim();
  const dataType = form.value.dataType.trim();

  if (!deviceId) {
    ElMessage.warning("请选择设备");
    return;
  }
  if (!key) {
    ElMessage.warning("请输入点位 Key");
    return;
  }
  if (!dataType) {
    ElMessage.warning("请选择或输入数据类型");
    return;
  }

  loading.value = true;
  try {
    const unit = form.value.unit.trim();
    let res;
    if (isEdit.value) {
      res = await updatePoint(pid, currentId.value, {
        deviceId,
        key,
        dataType,
        unit: unit ? unit : undefined
      });
    } else {
      res = await createPoint(pid, {
        deviceId,
        key,
        dataType,
        unit: unit ? unit : undefined
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

watch(
  () => projectId.value,
  async val => {
    if (val) {
      form.value.deviceId = "";
      await refreshDevices();
      await fetchList();
    } else {
      items.value = [];
      devices.value = [];
    }
  }
);

onMounted(() => {
  if (projectId.value) {
    refreshDevices();
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
            <div class="text-base font-medium">点位管理</div>
            <div class="text-xs text-gray-400">管理项目内的采集点位（Point）及其数据元信息</div>
          </div>
          <div class="flex items-center gap-3">
            <EmsProjectSelector v-model="projectId" />
            <el-button
              type="primary"
              :icon="useRenderIcon('ri:add-circle-line')"
              @click="handleAdd"
            >
              添加点位
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
        <el-table-column prop="key" label="点位 Key" min-width="150" show-overflow-tooltip>
          <template #default="{ row }">
            <span class="font-bold text-gray-700 dark:text-gray-200">{{ row.key }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="dataType" label="数据类型" width="120">
          <template #default="{ row }">
            <el-tag size="small" effect="plain">{{ row.dataType }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="unit" label="单位" width="100">
          <template #default="{ row }">
            <span class="text-gray-500">{{ row.unit || '-' }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="deviceId" label="所属设备 ID" min-width="180">
          <template #default="{ row }">
            <code class="text-xs opacity-70">{{ row.deviceId }}</code>
          </template>
        </el-table-column>
        <el-table-column prop="pointId" label="点位 ID" min-width="180">
          <template #default="{ row }">
            <code class="text-xs opacity-70">{{ row.pointId }}</code>
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
      :title="isEdit ? '编辑点位' : '添加点位'"
      width="500px"
      append-to-body
      destroy-on-close
    >
      <el-form :model="form" label-position="top">
        <el-form-item label="所属设备" required>
          <el-select
            v-model="form.deviceId"
            class="w-full"
            filterable
            placeholder="选择设备"
          >
            <el-option
              v-for="opt in deviceOptions"
              :key="opt.value"
              :label="opt.label"
              :value="opt.value"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="点位 Key" required>
          <el-input v-model="form.key" placeholder="例如：voltage_a, temperature" />
        </el-form-item>
        <el-form-item label="数据类型" required>
          <el-select v-model="form.dataType" class="w-full">
            <el-option label="Float" value="float" />
            <el-option label="Integer" value="int" />
            <el-option label="Boolean" value="bool" />
            <el-option label="String" value="string" />
          </el-select>
        </el-form-item>
        <el-form-item label="单位">
          <el-input v-model="form.unit" placeholder="可选，例如：V, ℃, kW" />
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
</style>
