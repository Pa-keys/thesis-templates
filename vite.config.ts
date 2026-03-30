import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      input: {
        main: 'pages/login.html',
        templates: 'pages/templates.html',
        details: 'pages/details.html',
        doctor: 'pages/doctor.html',
        nurse: 'pages/nurse.html',
        bhw: 'pages/bhw.html',
        pharmacist: 'pages/pharmacist.html',
        laboratory: 'pages/laboratory.html',
        admin: 'pages/admin.html',
      }
    }
  }
})