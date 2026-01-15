<script setup lang="ts">
import { ref } from "vue";
import { listPoints, createPoint, type PointDto } from "@/api/ems/points";

defineOptions({
  name: "EmsPoints"
});

const loading = ref(false);
const items = ref<PointDto[]>([]);
const error = ref("");
const projectId = ref("");
const form = ref({
  deviceId: "",
  key: "",
  dataType: "float",
  unit: ""
});

const fetchList = async () => {
  error.value = "";
  const pid = projectId.value.trim();
  if (!pid) {
    error.value = "请输入 projectId";
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

const submit = async () => {
  error.value = "";
  const pid = projectId.value.trim();
  if (!pid) {
    error.value = "请输入 projectId";
    return;
  }
  const deviceId = form.value.deviceId.trim();
  if (!deviceId) {
    error.value = "请输入 deviceId";
    return;
  }
  const key = form.value.key.trim();
  if (!key) {
    error.value = "请输入点位 key";
    return;
  }
  const dataType = form.value.dataType.trim();
  if (!dataType) {
    error.value = "请输入 dataType";
    return;
  }
  loading.value = true;
  try {
    const unit = form.value.unit.trim();
    const res = await createPoint(pid, {
      deviceId,
      key,
      dataType,
      unit: unit ? unit : undefined
    });
    if (!res.success) {
      error.value = res.error?.message ?? "创建失败";
      return;
    }
    form.value.key = "";
    await fetchList();
  } catch (err) {
    error.value = "请求失败";
  } finally {
    loading.value = false;
  }
};
</script>

<template>
  <div>
    <el-card shadow="never" class="mb-4!">
      <template #header>
        <div>点位列表</div>
      </template>
      <el-form label-width="120px">
        <el-form-item label="projectId">
          <el-input v-model="projectId" placeholder="项目 ID" />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :loading="loading" @click="fetchList">
            加载列表
          </el-button>
          <span v-if="error" class="ml-2 text-red-500">{{ error }}</span>
        </el-form-item>
      </el-form>
      <el-table class="mt-4" :data="items" border>
        <el-table-column prop="pointId" label="pointId" min-width="220" />
        <el-table-column prop="deviceId" label="deviceId" min-width="220" />
        <el-table-column prop="key" label="key" min-width="140" />
        <el-table-column prop="dataType" label="dataType" min-width="140" />
        <el-table-column prop="unit" label="unit" min-width="120" />
      </el-table>
    </el-card>

    <el-card shadow="never">
      <template #header>
        <div>创建点位</div>
      </template>
      <el-form :model="form" label-width="120px">
        <el-form-item label="projectId">
          <el-input v-model="projectId" placeholder="项目 ID" />
        </el-form-item>
        <el-form-item label="deviceId">
          <el-input v-model="form.deviceId" placeholder="设备 ID" />
        </el-form-item>
        <el-form-item label="key">
          <el-input v-model="form.key" placeholder="点位 key" />
        </el-form-item>
        <el-form-item label="dataType">
          <el-input v-model="form.dataType" placeholder="float/int/string" />
        </el-form-item>
        <el-form-item label="unit">
          <el-input v-model="form.unit" placeholder="可选" />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :loading="loading" @click="submit">
            创建
          </el-button>
        </el-form-item>
      </el-form>
    </el-card>
  </div>
</template>
