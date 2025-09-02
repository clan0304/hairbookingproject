// components/services/CategoriesTab.tsx
// ============================================
'use client';

import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, FolderOpen } from 'lucide-react';
import { ServiceCategory } from '@/types/database';
import { CategoryModal } from './CategoryModal';

export function CategoriesTab() {
  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalState, setModalState] = useState<{
    isOpen: boolean;
    mode: 'create' | 'edit';
    category: ServiceCategory | null;
  }>({
    isOpen: false,
    mode: 'create',
    category: null,
  });

  useEffect(() => {
    fetchCategories();
  }, []);

  async function fetchCategories() {
    try {
      const response = await fetch('/api/admin/services/categories');
      const data = await response.json();
      if (response.ok) {
        setCategories(data.data || []);
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
    } finally {
      setLoading(false);
    }
  }

  const handleDelete = async (id: string) => {
    if (
      !confirm(
        'Are you sure you want to delete this category? All services in this category will also be deleted.'
      )
    ) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/services/categories/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        fetchCategories();
      }
    } catch (error) {
      console.error('Error deleting category:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Loading categories...</div>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              Service Categories
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              Organize your services into categories for better management
            </p>
          </div>
          <button
            onClick={() =>
              setModalState({ isOpen: true, mode: 'create', category: null })
            }
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            <Plus size={20} className="mr-2" />
            Add Category
          </button>
        </div>

        {/* Categories Grid */}
        {categories.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-lg">
            <FolderOpen size={48} className="mx-auto mb-4 text-gray-300" />
            <p className="text-gray-500 text-lg mb-2">No categories found</p>
            <p className="text-gray-400 text-sm">
              Create your first category to get started
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {categories.map((category) => (
              <div
                key={category.id}
                className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center">
                    <div
                      className="w-10 h-10 rounded-full mr-3"
                      style={{ backgroundColor: category.color }}
                    />
                    <div>
                      <h3 className="font-semibold text-gray-900">
                        {category.name}
                      </h3>
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium mt-1 ${
                          category.is_active
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {category.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  </div>
                  <div className="flex space-x-1">
                    <button
                      onClick={() =>
                        setModalState({ isOpen: true, mode: 'edit', category })
                      }
                      className="p-1 hover:bg-gray-100 rounded transition-colors"
                    >
                      <Edit2 size={16} className="text-gray-600" />
                    </button>
                    <button
                      onClick={() => handleDelete(category.id)}
                      className="p-1 hover:bg-gray-100 rounded transition-colors"
                    >
                      <Trash2 size={16} className="text-red-600" />
                    </button>
                  </div>
                </div>
                {category.description && (
                  <p className="text-sm text-gray-600 line-clamp-2">
                    {category.description}
                  </p>
                )}
                <div className="mt-3 pt-3 border-t border-gray-100">
                  <p className="text-xs text-gray-500">
                    Created {new Date(category.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Category Modal */}
      {modalState.isOpen && (
        <CategoryModal
          mode={modalState.mode}
          category={modalState.category}
          onClose={() =>
            setModalState({ isOpen: false, mode: 'create', category: null })
          }
          onSuccess={() => {
            setModalState({ isOpen: false, mode: 'create', category: null });
            fetchCategories();
          }}
        />
      )}
    </>
  );
}
