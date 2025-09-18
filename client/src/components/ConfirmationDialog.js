import React from 'react';
import { X, AlertTriangle } from 'lucide-react';

const ConfirmationDialog = ({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title = "تأكيد الحذف", 
  message = "هل أنت متأكد من حذف هذا العنصر؟", 
  confirmText = "حذف", 
  cancelText = "إلغاء",
  type = "danger" // danger, warning, info
}) => {
  if (!isOpen) return null;

  const getTypeStyles = () => {
    switch (type) {
      case 'warning':
        return {
          icon: 'text-yellow-600',
          iconBg: 'bg-yellow-100',
          confirmBtn: 'bg-yellow-600 hover:bg-yellow-700 text-white',
          border: 'border-yellow-200'
        };
      case 'info':
        return {
          icon: 'text-blue-600',
          iconBg: 'bg-blue-100',
          confirmBtn: 'bg-blue-600 hover:bg-blue-700 text-white',
          border: 'border-blue-200'
        };
      default: // danger
        return {
          icon: 'text-red-600',
          iconBg: 'bg-red-100',
          confirmBtn: 'bg-red-600 hover:bg-red-700 text-white',
          border: 'border-red-200'
        };
    }
  };

  const styles = getTypeStyles();

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={handleBackdropClick}
    >
      <div className={`bg-white rounded-lg shadow-xl max-w-md w-full border-2 ${styles.border} animate-in fade-in-0 zoom-in-95 duration-200`}>
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3 rtl:space-x-reverse">
            <div className={`p-2 rounded-full ${styles.iconBg}`}>
              <AlertTriangle className={`h-6 w-6 ${styles.icon}`} />
            </div>
            <h3 className="text-lg font-semibold text-gray-900">
              {title}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <p className="text-gray-600 text-right leading-relaxed">
            {message}
          </p>
          <p className="text-sm text-gray-500 text-right mt-2">
            لا يمكن التراجع عن هذا الإجراء
          </p>
        </div>

        {/* Actions */}
        <div className="flex justify-end space-x-3 rtl:space-x-reverse p-6 border-t border-gray-200 bg-gray-50 rounded-b-lg">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            className={`px-4 py-2 rounded-lg transition-colors font-medium ${styles.confirmBtn}`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmationDialog;
