const routes = [
  {
    path: '/',
    component: () => import('layouts/MainLayout.vue'),
    children: [
      { path: '', redirect: '/login' },
      { path: 'login', component: () => import('pages/LoginPage.vue'), meta: { guestOnly: true } },
      { path: 'register', component: () => import('pages/RegisterPage.vue'), meta: { guestOnly: true } },
      { path: 'dashboard', component: () => import('pages/DashboardPage.vue'), meta: { requiresAuth: true } },
      { path: 'start-work', component: () => import('pages/message/StartWorkPage.vue'), meta: { requiresAuth: true } },
      { path: 'pending-approval', component: () => import('pages/PendingApprovalPage.vue'), meta: { guestOnly: true } }
    ]
  },

  // Always leave this as last one,
  // but you can also remove it
  {
    path: '/:catchAll(.*)*',
    component: () => import('pages/ErrorNotFound.vue')
  }
]

export default routes
