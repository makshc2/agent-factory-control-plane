import { createRouter, createWebHistory } from 'vue-router'
import BoardView from '@/views/BoardView.vue'
import AnalysisView from '@/views/AnalysisView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'board',
      component: BoardView,
    },
    {
      path: '/analysis',
      redirect: '/',
    },
    {
      path: '/analysis/:projectId',
      name: 'analysis',
      component: AnalysisView,
    },
  ],
})

export default router
