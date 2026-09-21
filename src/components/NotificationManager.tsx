import { useEffect, useRef } from 'react';
import { useAppStore } from '../store';

export default function NotificationManager() {
  const { state } = useAppStore();
  const notifiedItems = useRef<Set<string>>(new Set());

  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'granted') {
      // Check low stock
      const lowStockItems = state.inventory.filter(i => i.quantity <= i.minQuantity);
      lowStockItems.forEach(item => {
        if (!notifiedItems.current.has(item.id)) {
          new Notification('تنبيه نواقص المخزون', {
            body: `الصنف "${item.name}" وصل إلى حد الطلب (${item.quantity} ${item.unit}). يرجى طلب كمية جديدة.`,
            icon: 'https://cdn-icons-png.flaticon.com/512/5680/5680008.png'
          });
          notifiedItems.current.add(item.id);
        }
      });
      
      // If item is restocked, remove it from the set so it can trigger again later
      state.inventory.forEach(item => {
        if (item.quantity > item.minQuantity && notifiedItems.current.has(item.id)) {
          notifiedItems.current.delete(item.id);
        }
      });
    }
  }, [state.inventory]);

  return null;
}
