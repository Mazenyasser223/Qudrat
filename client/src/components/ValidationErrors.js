import React from 'react';
import { AlertTriangle, X } from 'lucide-react';

const ValidationErrors = ({ errors, onClose }) => {
  if (!errors || errors.length === 0) return null;

  return (
    <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
      <div className="flex items-start">
        <div className="flex-shrink-0">
          <AlertTriangle className="h-5 w-5 text-red-400" />
        </div>
        <div className="mr-3 flex-1">
          <h3 className="text-sm font-medium text-red-800">
            أخطاء في التحقق من البيانات
          </h3>
          <div className="mt-2">
            <ul className="list-disc list-inside space-y-1 text-sm text-red-700">
              {errors.map((error, index) => (
                <li key={index}>
                  {error.msg || error.message || error}
                </li>
              ))}
            </ul>
          </div>
        </div>
        {onClose && (
          <div className="flex-shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="bg-red-50 rounded-md p-1.5 text-red-400 hover:text-red-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-red-50 focus:ring-red-600"
            >
              <span className="sr-only">إغلاق</span>
              <X className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ValidationErrors;
