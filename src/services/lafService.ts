import { Cloud } from "laf-client-sdk";

/**
 * Laf 客户端初始化
 * 你需要在 Laf 官网 (https://laf.run) 创建一个应用，
 * 然后在环境变量里设置 VITE_LAF_APP_ID
 */
const appId = import.meta.env.VITE_LAF_APP_ID;
const isConfigured = appId && appId !== "你的Laf_AppID";
const baseUrl = isConfigured ? `https://${appId}.laf.run` : "";

// 导出 cloud 对象供全局使用
export const cloud = isConfigured ? new Cloud({
  baseUrl: baseUrl,
  getAccessToken: () => localStorage.getItem("access_token") || "", 
}) : null;

// 数据库对象
export const db = cloud ? cloud.database() : null;

export const lafService = {
  isConfigured: () => !!isConfigured,
  // 获取当前鱼塘的状态
  getPondStatus: async (pondId: string) => {
    if (!db) return null;
    const res = await db.collection("ponds").doc(pondId).get();
    return res.data;
  },

  // 更新传感器数据
  updateSensors: async (pondId: string, data: any) => {
    if (!db) return null;
    return await db.collection("ponds").doc(pondId).update({
      sensors: data,
      lastUpdate: new Date()
    });
  },

  // 记录报警信息
  logAlert: async (alert: any) => {
    if (!db) return null;
    return await db.collection("alerts").add({
      ...alert,
      createdAt: new Date()
    });
  },

  // 控制设备状态
  toggleEquipment: async (eqId: string, status: string) => {
    if (!db) return null;
    return await db.collection("equipment").doc(eqId).update({
      status: status,
      lastActionAt: new Date()
    });
  }
};
