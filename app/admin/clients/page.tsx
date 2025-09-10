/* eslint-disable @typescript-eslint/no-explicit-any */
// app/admin/clients/page.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import { Plus, Download, Users } from 'lucide-react';
import { toast } from 'sonner';
import { ClientsTable } from '@/components/clients/ClientsTable';
import { ClientModal } from '@/components/clients/ClientModal';
import { ClientDetailsModal } from '@/components/clients/ClientDetailsModal';
import type { Client } from '@/types/database';

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    limit: 10,
    totalPages: 0,
  });

  // Modal states
  const [showClientModal, setShowClientModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');

  // Fetch clients with debouncing for search
  const fetchClients = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '10',
        search: searchQuery,
        sortBy: 'created_at',
        sortOrder: 'desc',
      });

      const response = await fetch(`/api/admin/clients?${params}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch clients');
      }

      setClients(data.data || []);
      setPagination(data.pagination);
    } catch (error) {
      console.error('Error fetching clients:', error);
      toast.error('Failed to load clients');
    } finally {
      setLoading(false);
    }
  }, [currentPage, searchQuery]);

  // Debounced search
  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      fetchClients();
    }, 300);

    return () => clearTimeout(debounceTimer);
  }, [fetchClients]);

  // Handle search change
  const handleSearchChange = (query: string) => {
    setSearchQuery(query);
    setCurrentPage(1); // Reset to first page on search
  };

  // Handle page change
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  // Handle create client
  const handleCreateClient = () => {
    setSelectedClient(null);
    setModalMode('create');
    setShowClientModal(true);
  };

  // Handle edit client
  const handleEditClient = (client: Client) => {
    setSelectedClient(client);
    setModalMode('edit');
    setShowClientModal(true);
  };

  // Handle view client
  const handleViewClient = (client: Client) => {
    setSelectedClient(client);
    setShowDetailsModal(true);
  };

  // Handle save client (create or update)
  const handleSaveClient = async (clientData: Partial<Client>) => {
    try {
      const url =
        modalMode === 'edit' && selectedClient
          ? `/api/admin/clients/${selectedClient.id}`
          : '/api/admin/clients';

      const method = modalMode === 'edit' ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(clientData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to save client');
      }

      toast.success(
        modalMode === 'edit'
          ? 'Client updated successfully'
          : 'Client created successfully'
      );

      setShowClientModal(false);
      fetchClients(); // Refresh the list
    } catch (error: any) {
      toast.error(error.message || 'Failed to save client');
      throw error; // Re-throw to be handled by the modal
    }
  };

  // Handle delete client
  const handleDeleteClient = async (client: Client) => {
    try {
      const response = await fetch(`/api/admin/clients/${client.id}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete client');
      }

      toast.success('Client deleted successfully');
      fetchClients(); // Refresh the list
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete client');
    }
  };

  // Handle export clients
  const handleExportClients = () => {
    // Convert clients to CSV
    const headers = [
      'First Name',
      'Last Name',
      'Email',
      'Phone',
      'Status',
      'Created',
    ];
    const csvContent = [
      headers.join(','),
      ...clients.map((client) =>
        [
          client.first_name,
          client.last_name || '',
          client.email || '',
          client.phone || '',
          client.is_authenticated ? 'Registered' : 'Guest',
          new Date(client.created_at).toLocaleDateString(),
        ].join(',')
      ),
    ].join('\n');

    // Create and download CSV file
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `clients-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);

    toast.success('Clients exported successfully');
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                <Users className="w-8 h-8 text-blue-600" />
                Clients
              </h1>
              <p className="text-gray-600 mt-2">
                Manage your client database and contact information
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleExportClients}
                className="px-4 py-2 text-gray-700 bg-white border rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                Export
              </button>
              <button
                onClick={handleCreateClient}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Add Client
              </button>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  Total Clients
                </p>
                <p className="text-2xl font-semibold text-gray-900 mt-1">
                  {pagination.total}
                </p>
              </div>
              <div className="p-3 bg-blue-100 rounded-lg">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  Registered Users
                </p>
                <p className="text-2xl font-semibold text-gray-900 mt-1">
                  {clients.filter((c) => c.is_authenticated).length}
                </p>
              </div>
              <div className="p-3 bg-green-100 rounded-lg">
                <Users className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  Guest Clients
                </p>
                <p className="text-2xl font-semibold text-gray-900 mt-1">
                  {clients.filter((c) => !c.is_authenticated).length}
                </p>
              </div>
              <div className="p-3 bg-gray-100 rounded-lg">
                <Users className="w-6 h-6 text-gray-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Clients Table */}
        <ClientsTable
          clients={clients}
          pagination={pagination}
          searchQuery={searchQuery}
          onSearchChange={handleSearchChange}
          onPageChange={handlePageChange}
          onEdit={handleEditClient}
          onDelete={handleDeleteClient}
          onView={handleViewClient}
          loading={loading}
        />
      </div>

      {/* Client Modal (Add/Edit) */}
      <ClientModal
        isOpen={showClientModal}
        onClose={() => setShowClientModal(false)}
        client={selectedClient}
        onSave={handleSaveClient}
        mode={modalMode}
      />

      {/* Client Details Modal */}
      {showDetailsModal && selectedClient && (
        <ClientDetailsModal
          isOpen={showDetailsModal}
          onClose={() => setShowDetailsModal(false)}
          client={selectedClient}
          onEdit={() => {
            setShowDetailsModal(false);
            handleEditClient(selectedClient);
          }}
        />
      )}
    </div>
  );
}
