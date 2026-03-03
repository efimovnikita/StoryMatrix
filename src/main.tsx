import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'
import { registerSW } from 'virtual:pwa-register';

// Регистрируем Service Worker и настраиваем простое уведомление об обновлении
const updateSW = registerSW({
  onNeedRefresh() {
    // Когда кэш обновится (например, выкатили новую версию),
    // браузер спросит пользователя, хочет ли он обновить страницу.
    if (confirm('Доступна новая версия приложения. Обновить сейчас?')) {
      updateSW(true);
    }
  },
  onOfflineReady() {
    console.log('Приложение готово к работе в автономном режиме');
  },
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
