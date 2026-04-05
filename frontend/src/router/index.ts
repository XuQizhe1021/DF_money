import { createRouter, createWebHistory } from "vue-router";

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: "/",
      redirect: "/dashboard",
    },
    {
      path: "/dashboard",
      name: "dashboard",
      component: () => import("../views/Dashboard.vue"),
    },
    {
      path: "/charts",
      name: "charts",
      component: () => import("../views/Charts.vue"),
    },
    {
      path: "/ai-advice",
      name: "aiAdvice",
      component: () => import("../views/AIAdvice.vue"),
    },
    {
      path: "/holdings",
      name: "holdings",
      component: () => import("../views/Holdings.vue"),
    },
  ],
});

export default router;
