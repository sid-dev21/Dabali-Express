import React, { useState, useEffect } from 'react';
import { Bell, Check, X, Clock, CheckCircle, XCircle, AlertCircle, Trash2 } from 'lucide-react';
import { Notification } from '../src/types';
import { notificationsApi } from '../services/api';

interface NotificationsProps {
  isOpen: boolean;
  onClose: () => void;
}

const Notifications: React.FC<NotificationsProps> = ({ isOpen, onClose }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);

  const getNotificationId = (notification: any): string => {
    if (!notification) return '';
    const direct = notification.id ?? notification._id;
    if (!direct) return '';
    if (typeof direct === 'string') return direct;
    if (typeof direct === 'object') return String(direct._id || direct.id || '');
    return String(direct);
  };

  useEffect(() => {
    if (isOpen) {
      fetchNotifications();
      fetchUnreadCount();
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const intervalId = window.setInterval(() => {
      fetchNotifications();
      fetchUnreadCount();
    }, 15000);
    return () => window.clearInterval(intervalId);
  }, [isOpen]);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const response = await notificationsApi.getNotifications(false);
      setNotifications(response || []);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUnreadCount = async () => {
    try {
      const response = await notificationsApi.getUnreadCount();
      setUnreadCount(response?.count || 0);
    } catch (error) {
      console.error('Error fetching unread count:', error);
    }
  };

  const markAsRead = async (notificationId: string | number) => {
    try {
      const ok = await notificationsApi.markAsRead(notificationId);
      if (!ok) {
        alert('Impossible de marquer la notification comme lue.');
        return;
      }
      setNotifications(prev =>
        prev.map(notif =>
          getNotificationId(notif) === String(notificationId) ? { ...notif, read: true } : notif
        )
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      const ok = await notificationsApi.markAllAsRead();
      if (!ok) {
        alert('Impossible de marquer toutes les notifications comme lues.');
        return;
      }
      setNotifications(prev =>
        prev.map(notif => ({ ...notif, read: true }))
      );
      setUnreadCount(0);
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'MEAL_TAKEN':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'MEAL_MISSED':
        return <XCircle className="w-5 h-5 text-red-500" />;
      case 'MENU_APPROVED':
        return <Check className="w-5 h-5 text-green-500" />;
      case 'MENU_REJECTED':
        return <X className="w-5 h-5 text-red-500" />;
      case 'ABSENCE':
        return <AlertCircle className="w-5 h-5 text-yellow-500" />;
      case 'MENU_UPDATED':
        return <AlertCircle className="w-5 h-5 text-blue-500" />;
      case 'MENU_DELETED':
        return <XCircle className="w-5 h-5 text-red-500" />;
      case 'MENU_SUBMITTED':
      case 'WEEK_MENU_AVAILABLE':
        return <CheckCircle className="w-5 h-5 text-emerald-500" />;
      default:
        return <Bell className="w-5 h-5 text-gray-500" />;
    }
  };

  const deleteNotification = async (notificationId: string | number) => {
    try {
      const target = notifications.find((notif) => getNotificationId(notif) === String(notificationId));
      const ok = await notificationsApi.deleteNotification(notificationId);
      if (!ok) {
        alert('Suppression impossible. Vérifiez votre session ou réessayez.');
        return;
      }
      setNotifications((prev) => prev.filter((notif) => getNotificationId(notif) !== String(notificationId)));
      if (target && !target.read) {
        setUnreadCount((prev) => Math.max(0, prev - 1));
      }
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'À l\'instant';
    if (diffMins < 60) return `Il y a ${diffMins} min`;
    if (diffHours < 24) return `Il y a ${diffHours}h`;
    return `Il y a ${diffDays}j`;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-end">
      <div className="surface-card w-full max-w-md h-full rounded-none shadow-lg">
        <div className="p-4 border-b flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Bell className="w-5 h-5" />
            <h2 className="text-lg font-semibold">Notifications</h2>
            {unreadCount > 0 && (
              <span className="bg-red-500 text-white text-xs rounded-full px-2 py-1">
                {unreadCount}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="text-sm text-emerald-600 hover:text-emerald-700"
              >
                Tout marquer comme lu
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1 hover:bg-gray-100 rounded"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="p-4 text-center">
              <Clock className="w-8 h-8 animate-spin mx-auto text-gray-400" />
              <p className="mt-2 text-gray-500">Chargement...</p>
            </div>
          ) : notifications.length === 0 ? (
            <div className="p-8 text-center">
              <Bell className="w-12 h-12 mx-auto text-gray-300" />
              <p className="mt-4 text-gray-500">Aucune notification</p>
            </div>
          ) : (
            <div className="divide-y">
              {notifications.map((notification) => {
                const notifId = getNotificationId(notification as any);
                if (!notifId) return null;
                return (
                  <div
                    key={notifId}
                    className={`p-4 hover:bg-gray-50 cursor-pointer transition-colors ${
                      !notification.read ? 'bg-emerald-50' : ''
                    }`}
                    onClick={() => !notification.read && markAsRead(notifId)}
                  >
                    <div className="flex items-start gap-3">
                      <div className="mt-1">
                        {getNotificationIcon(notification.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start">
                          <h3 className="font-medium text-sm text-gray-900">
                            {notification.title}
                          </h3>
                          <span className="text-xs text-gray-500 ml-2 whitespace-nowrap">
                            {formatTime((notification as any).createdAt || (notification as any).created_at || new Date().toISOString())}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 mt-1">
                          {notification.message}
                        </p>
                        {notification.related_student_id && (
                          <div className="flex items-center gap-2 mt-2">
                            <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                              {notification.student_first_name} {notification.student_last_name}
                            </span>
                            {notification.meal_type && (
                              <span className="text-xs bg-emerald-100 text-emerald-600 px-2 py-1 rounded">
                                {notification.meal_type}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteNotification(notifId);
                          }}
                          className="p-1 rounded text-red-500 hover:bg-red-50"
                          title="Supprimer la notification"
                          aria-label="Supprimer la notification"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                        {!notification.read && (
                          <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Notifications;
