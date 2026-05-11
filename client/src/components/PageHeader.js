import React from 'react';

export default function PageHeader({ title, description, action }) {
  return (
    <div className="bg-gradient-to-r from-primary-600 to-primary-700 rounded-xl p-6 text-white">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold mb-2">{title}</h1>
          {description ? <p className="text-primary-100">{description}</p> : null}
        </div>
        {action ? <div>{action}</div> : null}
      </div>
    </div>
  );
}

