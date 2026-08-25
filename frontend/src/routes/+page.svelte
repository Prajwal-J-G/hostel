<script lang="ts">
  import { onMount } from 'svelte';
  import { userStore } from '$lib/store';
  import { api } from '$lib/api';

  let user = $state<any>(null);
  let activeTab = $state('overview');
  let errorMsg = $state('');
  let successMsg = $state('');

  // Core Data Lists
  let hostels = $state<any[]>([]);
  let rooms = $state<any[]>([]);
  let requests = $state<any[]>([]);
  let dues = $state<any[]>([]);
  let invoices = $state<any[]>([]);
  let notifications = $state<any[]>([]);
  let chats = $state<any[]>([]);
  let inventory = $state<any[]>([]);
  let menu = $state<any>(null);

  // Form Fields
  // 1. Student Request
  let reqHostelId = $state('');
  let reqRoomType = $state('double');
  let reqNotes = $state('');
  // 2. Student Payment
  let payTransactionId = $state('');
  // 3. Admin Hostel
  let hostName = $state('');
  let hostAddress = $state('');
  let hostWardenId = $state('');
  // 4. Admin Room
  let roomHostelId = $state('');
  let roomNumber = $state('');
  let roomCapacity = $state(2);
  // 5. Admin Invoice
  let invStudentId = $state('');
  let invAmount = $state('');
  let invType = $state('hostel_fee');
  let invDueDate = $state('');
  // 6. Chef Inventory
  let itemHostelId = $state('');
  let itemName = $state('');
  let itemUnit = $state('kg');
  let itemMinThreshold = $state('');
  // 7. Chef Transaction
  let txItemId = $state('');
  let txType = $state('IN');
  let txQty = $state('');
  let txNotes = $state('');
  // 8. Menu Editor
  let selectedHostelId = $state('');
  let menuMonBreakfast = $state('Not Set'), menuMonLunch = $state('Not Set'), menuMonDinner = $state('Not Set');
  let menuTueBreakfast = $state('Not Set'), menuTueLunch = $state('Not Set'), menuTueDinner = $state('Not Set');
  let menuWedBreakfast = $state('Not Set'), menuWedLunch = $state('Not Set'), menuWedDinner = $state('Not Set');
  let menuThuBreakfast = $state('Not Set'), menuThuLunch = $state('Not Set'), menuThuDinner = $state('Not Set');
  let menuFriBreakfast = $state('Not Set'), menuFriLunch = $state('Not Set'), menuFriDinner = $state('Not Set');
  let menuSatBreakfast = $state('Not Set'), menuSatLunch = $state('Not Set'), menuSatDinner = $state('Not Set');
  let menuSunBreakfast = $state('Not Set'), menuSunLunch = $state('Not Set'), menuSunDinner = $state('Not Set');
  // 9. Notification Broadcast
  let notifTitle = $state('');
  let notifContent = $state('');
  let notifGender = $state('all');
  let notifHostelId = $state('');

  onMount(() => {
    userStore.subscribe(async (val) => {
      user = val;
      if (user) {
        loadData();
      }
    });
  });

  async function loadData() {
    errorMsg = '';
    try {
      hostels = await api.getHostels();
      if (hostels.length > 0) {
        selectedHostelId = hostels[0].id;
        reqHostelId = hostels[0].id;
        roomHostelId = hostels[0].id;
        itemHostelId = hostels[0].id;
        notifHostelId = hostels[0].id;
        fetchMenu(selectedHostelId);
      }

      notifications = await api.getNotifications();

      // Role specific loads
      const roles = user.roles;
      if (roles.includes('STUDENT')) {
        dues = await api.getMyDues();
        requests = await api.getRequests();
      }
      if (roles.includes('ADMIN')) {
        invoices = await api.getAllInvoices();
        requests = await api.getRequests();
        rooms = await api.getRooms();
      }
      if (roles.includes('WARDEN')) {
        requests = await api.getRequests();
        rooms = await api.getRooms();
        if (hostels.length > 0) {
          inventory = await api.getInventory(hostels[0].id);
        }
      }
      if (roles.includes('CHEF')) {
        if (hostels.length > 0) {
          inventory = await api.getInventory(hostels[0].id);
        }
      }
    } catch (err: any) {
      errorMsg = err.message;
    }
  }

  async function fetchMenu(hostelId: string) {
    try {
      menu = await api.getMenu(hostelId);
      if (menu && menu.dailyMenus) {
        const mon = menu.dailyMenus.find((d: any) => d.dayOfWeek === 'monday');
        if (mon) { menuMonBreakfast = mon.breakfast; menuMonLunch = mon.lunch; menuMonDinner = mon.dinner; }
        const tue = menu.dailyMenus.find((d: any) => d.dayOfWeek === 'tuesday');
        if (tue) { menuTueBreakfast = tue.breakfast; menuTueLunch = tue.lunch; menuTueDinner = tue.dinner; }
        const wed = menu.dailyMenus.find((d: any) => d.dayOfWeek === 'wednesday');
        if (wed) { menuWedBreakfast = wed.breakfast; menuWedLunch = wed.lunch; menuWedDinner = wed.dinner; }
        const thu = menu.dailyMenus.find((d: any) => d.dayOfWeek === 'thursday');
        if (thu) { menuThuBreakfast = thu.breakfast; menuThuLunch = thu.lunch; menuThuDinner = thu.dinner; }
        const fri = menu.dailyMenus.find((d: any) => d.dayOfWeek === 'friday');
        if (fri) { menuFriBreakfast = fri.breakfast; menuFriLunch = fri.lunch; menuFriDinner = fri.dinner; }
        const sat = menu.dailyMenus.find((d: any) => d.dayOfWeek === 'saturday');
        if (sat) { menuSatBreakfast = sat.breakfast; menuSatLunch = sat.lunch; menuSatDinner = sat.dinner; }
        const sun = menu.dailyMenus.find((d: any) => d.dayOfWeek === 'sunday');
        if (sun) { menuSunBreakfast = sun.breakfast; menuSunLunch = sun.lunch; menuSunDinner = sun.dinner; }
      }
    } catch (_) {
      menu = null;
    }
  }

  // Student Actions
  async function submitHousingRequest(e: SubmitEvent) {
    e.preventDefault();
    try {
      await api.submitRequest({ hostelId: reqHostelId, roomType: reqRoomType, notes: reqNotes });
      successMsg = 'Housing request submitted successfully!';
      reqNotes = '';
      loadData();
    } catch (err: any) {
      errorMsg = err.message;
    }
  }

  async function payInvoice(invoiceId: string) {
    if (!payTransactionId) {
      errorMsg = 'Please enter a transaction ID';
      return;
    }
    try {
      await api.payInvoice(invoiceId, payTransactionId);
      successMsg = 'Payment submitted. Awaiting verification.';
      payTransactionId = '';
      loadData();
    } catch (err: any) {
      errorMsg = err.message;
    }
  }

  // Admin Actions
  async function createHostel(e: SubmitEvent) {
    e.preventDefault();
    try {
      await api.createHostel({ name: hostName, address: hostAddress, wardenId: hostWardenId || undefined });
      successMsg = 'Hostel block registered successfully!';
      hostName = '';
      hostAddress = '';
      hostWardenId = '';
      loadData();
    } catch (err: any) {
      errorMsg = err.message;
    }
  }

  async function createRoom(e: SubmitEvent) {
    e.preventDefault();
    try {
      await api.createRoom({ hostelId: roomHostelId, roomNumber, capacity: roomCapacity });
      successMsg = `Room ${roomNumber} added successfully!`;
      roomNumber = '';
      loadData();
    } catch (err: any) {
      errorMsg = err.message;
    }
  }

  async function forwardRequest(reqId: string) {
    try {
      await api.forwardRequest(reqId);
      successMsg = 'Request forwarded to Warden.';
      loadData();
    } catch (err: any) {
      errorMsg = err.message;
    }
  }

  async function verifyInvoice(invId: string) {
    try {
      await api.verifyInvoice(invId);
      successMsg = 'Payment transaction verified and finalized.';
      loadData();
    } catch (err: any) {
      errorMsg = err.message;
    }
  }

  async function createInvoice(e: SubmitEvent) {
    e.preventDefault();
    try {
      await api.createInvoice({ studentId: invStudentId, amount: invAmount, type: invType, dueDate: invDueDate });
      successMsg = 'Invoice generated successfully!';
      invStudentId = '';
      invAmount = '';
      invDueDate = '';
      loadData();
    } catch (err: any) {
      errorMsg = err.message;
    }
  }

  // Warden Actions
  async function approveRequest(reqId: string) {
    try {
      await api.approveRequest(reqId);
      successMsg = 'Housing request approved and room assigned!';
      loadData();
    } catch (err: any) {
      errorMsg = err.message;
    }
  }

  async function rejectRequest(reqId: string) {
    try {
      await api.rejectRequest(reqId);
      successMsg = 'Housing request rejected.';
      loadData();
    } catch (err: any) {
      errorMsg = err.message;
    }
  }

  // Chef & Warden Kitchen Actions
  async function saveMenu(e: SubmitEvent) {
    e.preventDefault();
    try {
      await api.updateMenu({
        hostelId: selectedHostelId,
        monday: { breakfast: menuMonBreakfast, lunch: menuMonLunch, dinner: menuMonDinner },
        tuesday: { breakfast: menuTueBreakfast, lunch: menuTueLunch, dinner: menuTueDinner },
        wednesday: { breakfast: menuWedBreakfast, lunch: menuWedLunch, dinner: menuWedDinner },
        thursday: { breakfast: menuThuBreakfast, lunch: menuThuLunch, dinner: menuThuDinner },
        friday: { breakfast: menuFriBreakfast, lunch: menuFriLunch, dinner: menuFriDinner },
        saturday: { breakfast: menuSatBreakfast, lunch: menuSatLunch, dinner: menuSatDinner },
        sunday: { breakfast: menuSunBreakfast, lunch: menuSunLunch, dinner: menuSunDinner }
      });
      successMsg = 'Weekly mess menu updated!';
      fetchMenu(selectedHostelId);
    } catch (err: any) {
      errorMsg = err.message;
    }
  }

  async function addInventoryItem(e: SubmitEvent) {
    e.preventDefault();
    try {
      await api.createInventoryItem({
        hostelId: itemHostelId,
        itemName,
        unit: itemUnit,
        minThreshold: parseFloat(itemMinThreshold) || 0.00
      });
      successMsg = `Inventory item "${itemName}" created.`;
      itemName = '';
      itemMinThreshold = '';
      loadData();
    } catch (err: any) {
      errorMsg = err.message;
    }
  }

  async function recordInventoryTx(e: SubmitEvent) {
    e.preventDefault();
    try {
      await api.addInventoryTransaction({
        inventoryItemId: txItemId,
        type: txType,
        quantity: parseFloat(txQty),
        notes: txNotes || undefined
      });
      successMsg = 'Inventory transaction recorded.';
      txQty = '';
      txNotes = '';
      loadData();
    } catch (err: any) {
      errorMsg = err.message;
    }
  }

  // Broadcast Notification Action
  async function postAnnouncement(e: SubmitEvent) {
    e.preventDefault();
    try {
      await api.createNotification({
        title: notifTitle,
        content: notifContent,
        genderTarget: notifGender,
        targetHostelId: notifHostelId || undefined
      });
      successMsg = 'Announcement broadcasted successfully!';
      notifTitle = '';
      notifContent = '';
      loadData();
    } catch (err: any) {
      errorMsg = err.message;
    }
  }
</script>

{#if user}
  <div class="space-y-6">
    <!-- Messages alerts -->
    {#if errorMsg}
      <div class="p-4 bg-red-50 border-l-4 border-red-500 rounded text-sm text-red-700">
        {errorMsg}
      </div>
    {/if}
    {#if successMsg}
      <div class="p-4 bg-emerald-50 border-l-4 border-emerald-500 rounded text-sm text-emerald-700">
        {successMsg}
      </div>
    {/if}

    <!-- Tab navigation -->
    <div class="border-b border-slate-200">
      <nav class="-mb-px flex space-x-8">
        <button onclick={() => activeTab = 'overview'} class="py-4 px-1 border-b-2 font-medium text-sm {activeTab === 'overview' ? 'border-slate-800 text-slate-900' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'}">
          Overview
        </button>
        {#if user.roles.includes('STUDENT')}
          <button onclick={() => activeTab = 'housing'} class="py-4 px-1 border-b-2 font-medium text-sm {activeTab === 'housing' ? 'border-slate-800 text-slate-900' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'}">
            Apply Housing
          </button>
          <button onclick={() => activeTab = 'billing'} class="py-4 px-1 border-b-2 font-medium text-sm {activeTab === 'billing' ? 'border-slate-800 text-slate-900' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'}">
            My Invoices
          </button>
        {/if}
        {#if user.roles.includes('ADMIN')}
          <button onclick={() => activeTab = 'hostels'} class="py-4 px-1 border-b-2 font-medium text-sm {activeTab === 'hostels' ? 'border-slate-800 text-slate-900' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'}">
            Manage Asset Blocks
          </button>
          <button onclick={() => activeTab = 'invoices'} class="py-4 px-1 border-b-2 font-medium text-sm {activeTab === 'invoices' ? 'border-slate-800 text-slate-900' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'}">
            Ledger Audits
          </button>
        {/if}
        {#if user.roles.includes('WARDEN') || user.roles.includes('ADMIN')}
          <button onclick={() => activeTab = 'requests'} class="py-4 px-1 border-b-2 font-medium text-sm {activeTab === 'requests' ? 'border-slate-800 text-slate-900' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'}">
            Requests Queue
          </button>
        {/if}
        {#if user.roles.includes('WARDEN') || user.roles.includes('CHEF')}
          <button onclick={() => activeTab = 'kitchen'} class="py-4 px-1 border-b-2 font-medium text-sm {activeTab === 'kitchen' ? 'border-slate-800 text-slate-900' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'}">
            Kitchen & Mess
          </button>
        {/if}
      </nav>
    </div>

    <!-- View Contents -->
    {#if activeTab === 'overview'}
      <!-- Overview Panel -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
        <!-- Announcements Feed -->
        <div class="md:col-span-2 bg-white rounded-lg border border-slate-200 shadow-sm p-6 space-y-4">
          <h2 class="text-lg font-bold text-slate-800 uppercase tracking-wide border-b pb-2">Broadcast Notices</h2>
          {#if notifications.length === 0}
            <p class="text-sm text-slate-500">No active announcements</p>
          {:else}
            <div class="space-y-4 max-h-[400px] overflow-y-auto pr-2">
              {#each notifications as notif}
                <div class="p-4 bg-slate-50 border border-slate-200 rounded-md">
                  <h3 class="font-bold text-slate-800 text-sm">{notif.title}</h3>
                  <p class="text-xs text-slate-400 mt-0.5">Author: {notif.author?.name || 'Staff'}</p>
                  <p class="text-sm text-slate-600 mt-2">{notif.content}</p>
                </div>
              {/each}
            </div>
          {/if}

          <!-- Write Announcement (Admin/Warden) -->
          {#if user.roles.includes('ADMIN') || user.roles.includes('WARDEN')}
            <form onsubmit={postAnnouncement} class="border-t pt-4 space-y-3">
              <h3 class="font-bold text-xs uppercase text-slate-500">Post Announcement</h3>
              <input bind:value={notifTitle} type="text" placeholder="Title" required class="block w-full px-3 py-2 border border-slate-300 rounded text-sm focus:outline-none" />
              <textarea bind:value={notifContent} placeholder="Content text..." required class="block w-full px-3 py-2 border border-slate-300 rounded text-sm focus:outline-none h-20"></textarea>
              <div class="grid grid-cols-2 gap-4">
                <select bind:value={notifGender} class="block w-full px-3 py-2 border border-slate-300 bg-white rounded text-sm focus:outline-none">
                  <option value="all">Target All Genders</option>
                  <option value="male">Male Students Only</option>
                  <option value="female">Female Students Only</option>
                </select>
                <button type="submit" class="py-2 px-4 text-sm bg-slate-800 hover:bg-slate-700 text-white rounded font-medium">Broadcast</button>
              </div>
            </form>
          {/if}
        </div>

        <!-- Mess Menu Panel -->
        <div class="bg-white rounded-lg border border-slate-200 shadow-sm p-6 space-y-4">
          <h2 class="text-lg font-bold text-slate-800 uppercase tracking-wide border-b pb-2">Mess Menu</h2>
          <select bind:value={selectedHostelId} onchange={() => fetchMenu(selectedHostelId)} class="block w-full px-3 py-1.5 border border-slate-300 bg-white rounded text-xs focus:outline-none">
            {#each hostels as host}
              <option value={host.id}>{host.name}</option>
            {/each}
          </select>

          {#if !menu}
            <p class="text-sm text-slate-500">Weekly menu not set</p>
          {:else}
            <div class="space-y-3 text-xs max-h-[350px] overflow-y-auto">
              {#each menu.dailyMenus as day}
                <div class="p-2 border border-slate-100 rounded bg-slate-50">
                  <span class="font-bold uppercase text-slate-500 text-[10px]">{day.dayOfWeek}</span>
                  <div class="grid grid-cols-3 gap-1 mt-1 text-[11px] text-slate-700">
                    <div><span class="font-semibold text-slate-500">B:</span> {day.breakfast}</div>
                    <div><span class="font-semibold text-slate-500">L:</span> {day.lunch}</div>
                    <div><span class="font-semibold text-slate-500">D:</span> {day.dinner}</div>
                  </div>
                </div>
              {/each}
            </div>
          {/if}
        </div>
      </div>
    {/if}

    <!-- Tab: Housing Request Form -->
    {#if activeTab === 'housing'}
      <div class="max-w-xl bg-white rounded-lg border border-slate-200 shadow-sm p-6 space-y-6">
        <h2 class="text-lg font-bold text-slate-800 uppercase tracking-wide border-b pb-2">Submit Housing Application</h2>
        <form onsubmit={submitHousingRequest} class="space-y-4">
          <div>
            <label for="f-hostel" class="block text-xs font-semibold text-slate-500 uppercase">Requested Hostel Block</label>
            <select id="f-hostel" bind:value={reqHostelId} class="mt-1 block w-full px-3 py-2 border border-slate-300 bg-white rounded text-sm focus:outline-none">
              {#each hostels as host}
                <option value={host.id}>{host.name}</option>
              {/each}
            </select>
          </div>
          <div>
            <label for="f-type" class="block text-xs font-semibold text-slate-500 uppercase">Room Sharing Type</label>
            <select id="f-type" bind:value={reqRoomType} class="mt-1 block w-full px-3 py-2 border border-slate-300 bg-white rounded text-sm focus:outline-none">
              <option value="single">Single Sharing</option>
              <option value="double">Double Sharing</option>
              <option value="triple">Triple Sharing</option>
              <option value="dormitory">Dormitory</option>
            </select>
          </div>
          <div>
            <label for="f-notes" class="block text-xs font-semibold text-slate-500 uppercase">Application Notes</label>
            <textarea id="f-notes" bind:value={reqNotes} placeholder="Medical requests or details..." class="mt-1 block w-full px-3 py-2 border border-slate-300 rounded text-sm h-24 focus:outline-none"></textarea>
          </div>
          <button type="submit" class="w-full py-2 px-4 bg-slate-800 hover:bg-slate-700 text-white rounded font-medium text-sm">
            Submit Application
          </button>
        </form>

        <!-- Student Requests List -->
        <div class="border-t pt-6 space-y-4">
          <h3 class="font-bold text-xs uppercase text-slate-500">My Requests History</h3>
          {#each requests as req}
            <div class="p-4 border border-slate-200 rounded bg-slate-50 flex items-center justify-between text-sm">
              <div>
                <p class="font-bold text-slate-700">{req.hostel?.name}</p>
                <p class="text-xs text-slate-400 capitalize">Type: {req.roomType}</p>
              </div>
              <span class="px-2 py-0.5 text-xs rounded uppercase font-medium 
                {req.status === 'approved' ? 'bg-emerald-100 text-emerald-800' : 
                 req.status === 'rejected' ? 'bg-red-100 text-red-800' : 'bg-amber-100 text-amber-800'}">
                {req.status}
              </span>
            </div>
          {/each}
        </div>
      </div>
    {/if}

    <!-- Tab: Student Billing -->
    {#if activeTab === 'billing'}
      <div class="bg-white rounded-lg border border-slate-200 shadow-sm p-6 space-y-6">
        <h2 class="text-lg font-bold text-slate-800 uppercase tracking-wide border-b pb-2">Fee Ledger Invoices</h2>
        <div class="overflow-x-auto">
          <table class="min-w-full divide-y divide-slate-200 text-sm">
            <thead class="bg-slate-50">
              <tr>
                <th class="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Fee Type</th>
                <th class="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Amount Due</th>
                <th class="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Due Date</th>
                <th class="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Transaction ID</th>
                <th class="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Status</th>
                <th class="px-6 py-3 text-right text-xs font-semibold text-slate-500 uppercase">Action</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-200">
              {#each dues as bill}
                <tr>
                  <td class="px-6 py-4 capitalize font-semibold text-slate-700">{bill.type.replace('_', ' ')}</td>
                  <td class="px-6 py-4 font-mono">₹{bill.amount}</td>
                  <td class="px-6 py-4">{new Date(bill.dueDate).toLocaleDateString()}</td>
                  <td class="px-6 py-4 font-mono text-xs">{bill.transactionId || 'None'}</td>
                  <td class="px-6 py-4">
                    <span class="px-2 py-0.5 rounded text-xs font-medium uppercase
                      {bill.status === 'paid' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}">
                      {bill.status}
                    </span>
                  </td>
                  <td class="px-6 py-4 text-right">
                    {#if bill.status !== 'paid'}
                      <div class="inline-flex space-x-2">
                        <input bind:value={payTransactionId} type="text" placeholder="TX123456" class="px-2 py-1 border border-slate-300 rounded text-xs focus:outline-none" />
                        <button onclick={() => payInvoice(bill.id)} class="px-3 py-1 bg-slate-800 text-white rounded text-xs font-medium">Record Pay</button>
                      </div>
                    {:else}
                      <span class="text-xs text-slate-400">Settled</span>
                    {/if}
                  </td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
      </div>
    {/if}

    <!-- Tab: Admin Asset Blocks -->
    {#if activeTab === 'hostels'}
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <!-- Create Hostel Block -->
        <div class="bg-white rounded-lg border border-slate-200 shadow-sm p-6 space-y-4">
          <h2 class="text-lg font-bold text-slate-800 uppercase tracking-wide border-b pb-2">Register Hostel Block</h2>
          <form onsubmit={createHostel} class="space-y-4">
            <div>
              <label for="h-name" class="block text-xs font-semibold text-slate-500 uppercase">Block Name</label>
              <input id="h-name" bind:value={hostName} type="text" required placeholder="Block A Boys" class="mt-1 block w-full px-3 py-2 border border-slate-300 rounded text-sm focus:outline-none" />
            </div>
            <div>
              <label for="h-addr" class="block text-xs font-semibold text-slate-500 uppercase">Address / Campus Location</label>
              <input id="h-addr" bind:value={hostAddress} type="text" required placeholder="RNSIT Main Campus" class="mt-1 block w-full px-3 py-2 border border-slate-300 rounded text-sm focus:outline-none" />
            </div>
            <div>
              <label for="h-warden" class="block text-xs font-semibold text-slate-500 uppercase">Warden ID (UUID)</label>
              <input id="h-warden" bind:value={hostWardenId} type="text" placeholder="Optional Warden UUID" class="mt-1 block w-full px-3 py-2 border border-slate-300 rounded text-sm focus:outline-none" />
            </div>
            <button type="submit" class="w-full py-2 px-4 bg-slate-800 hover:bg-slate-700 text-white rounded font-medium text-sm">
              Register Block
            </button>
          </form>
        </div>

        <!-- Create Room Block -->
        <div class="bg-white rounded-lg border border-slate-200 shadow-sm p-6 space-y-4">
          <h2 class="text-lg font-bold text-slate-800 uppercase tracking-wide border-b pb-2">Add Room Configuration</h2>
          <form onsubmit={createRoom} class="space-y-4">
            <div>
              <label for="r-hostel" class="block text-xs font-semibold text-slate-500 uppercase">Hostel Block</label>
              <select id="r-hostel" bind:value={roomHostelId} class="mt-1 block w-full px-3 py-2 border border-slate-300 bg-white rounded text-sm focus:outline-none">
                {#each hostels as host}
                  <option value={host.id}>{host.name}</option>
                {/each}
              </select>
            </div>
            <div>
              <label for="r-num" class="block text-xs font-semibold text-slate-500 uppercase">Room Number</label>
              <input id="r-num" bind:value={roomNumber} type="text" required placeholder="101" class="mt-1 block w-full px-3 py-2 border border-slate-300 rounded text-sm focus:outline-none" />
            </div>
            <div>
              <label for="r-cap" class="block text-xs font-semibold text-slate-500 uppercase">Beds Capacity</label>
              <select id="r-cap" bind:value={roomCapacity} class="mt-1 block w-full px-3 py-2 border border-slate-300 bg-white rounded text-sm focus:outline-none">
                <option value={1}>1 Bed (Single)</option>
                <option value={2}>2 Beds (Double)</option>
                <option value={3}>3 Beds (Triple)</option>
                <option value={4}>4 Beds (Dormitory)</option>
              </select>
            </div>
            <button type="submit" class="w-full py-2 px-4 bg-slate-800 hover:bg-slate-700 text-white rounded font-medium text-sm">
              Add Room Config
            </button>
          </form>
        </div>
      </div>
    {/if}

    <!-- Tab: Admin Ledger Invoices -->
    {#if activeTab === 'invoices'}
      <div class="grid grid-cols-1 gap-6">
        <!-- Generate manual invoice -->
        <div class="bg-white rounded-lg border border-slate-200 shadow-sm p-6 space-y-4 max-w-xl">
          <h2 class="text-lg font-bold text-slate-800 uppercase tracking-wide border-b pb-2">Generate Manual Fee Invoice</h2>
          <form onsubmit={createInvoice} class="space-y-4">
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label for="i-stud" class="block text-xs font-semibold text-slate-500 uppercase">Student User ID (UUID)</label>
                <input id="i-stud" bind:value={invStudentId} type="text" required class="mt-1 block w-full px-3 py-2 border border-slate-300 rounded text-sm focus:outline-none" />
              </div>
              <div>
                <label for="i-amt" class="block text-xs font-semibold text-slate-500 uppercase">Invoice Amount (INR)</label>
                <input id="i-amt" bind:value={invAmount} type="number" required class="mt-1 block w-full px-3 py-2 border border-slate-300 rounded text-sm focus:outline-none" />
              </div>
            </div>
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label for="i-type" class="block text-xs font-semibold text-slate-500 uppercase">Fee Type</label>
                <select id="i-type" bind:value={invType} class="mt-1 block w-full px-3 py-2 border border-slate-300 bg-white rounded text-sm focus:outline-none">
                  <option value="hostel_fee">Hostel Rent Dues</option>
                  <option value="mess_fee">Mess/Catering Dues</option>
                  <option value="security_deposit">Refundable Security Deposit</option>
                </select>
              </div>
              <div>
                <label for="i-date" class="block text-xs font-semibold text-slate-500 uppercase">Due Date</label>
                <input id="i-date" bind:value={invDueDate} type="date" required class="mt-1 block w-full px-3 py-2 border border-slate-300 rounded text-sm focus:outline-none" />
              </div>
            </div>
            <button type="submit" class="py-2 px-4 bg-slate-800 hover:bg-slate-700 text-white rounded font-medium text-sm">
              Generate Invoice
            </button>
          </form>
        </div>

        <!-- Ledger validation queue -->
        <div class="bg-white rounded-lg border border-slate-200 shadow-sm p-6 space-y-4">
          <h2 class="text-lg font-bold text-slate-800 uppercase tracking-wide border-b pb-2">Global Invoices Audit</h2>
          <div class="overflow-x-auto">
            <table class="min-w-full divide-y divide-slate-200 text-sm">
              <thead class="bg-slate-50">
                <tr>
                  <th class="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Student Name</th>
                  <th class="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Type</th>
                  <th class="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Amount</th>
                  <th class="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Tx Code</th>
                  <th class="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Status</th>
                  <th class="px-6 py-3 text-right text-xs font-semibold text-slate-500 uppercase">Verify Action</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-200">
                {#each invoices as inv}
                  <tr>
                    <td class="px-6 py-4 font-medium text-slate-900">{inv.student?.name || 'N/A'}</td>
                    <td class="px-6 py-4 capitalize">{inv.type.replace('_', ' ')}</td>
                    <td class="px-6 py-4 font-mono">₹{inv.amount}</td>
                    <td class="px-6 py-4 font-mono text-xs">{inv.transactionId || 'None'}</td>
                    <td class="px-6 py-4">
                      <span class="px-2 py-0.5 rounded text-xs font-medium uppercase
                        {inv.status === 'paid' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}">
                        {inv.status}
                      </span>
                    </td>
                    <td class="px-6 py-4 text-right">
                      {#if inv.status !== 'paid' && inv.transactionId}
                        <button onclick={() => verifyInvoice(inv.id)} class="px-3 py-1 bg-slate-800 text-white rounded text-xs font-medium">Verify Receipt</button>
                      {:else if !inv.transactionId}
                        <span class="text-xs text-slate-400">Awaiting Pay</span>
                      {:else}
                        <span class="text-xs text-slate-400">Verified</span>
                      {/if}
                    </td>
                  </tr>
                {/each}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    {/if}

    <!-- Tab: Requests queue (Warden / Admin) -->
    {#if activeTab === 'requests'}
      <div class="bg-white rounded-lg border border-slate-200 shadow-sm p-6 space-y-4">
        <h2 class="text-lg font-bold text-slate-800 uppercase tracking-wide border-b pb-2">Room Requests Pipeline Queue</h2>
        <div class="overflow-x-auto">
          <table class="min-w-full divide-y divide-slate-200 text-sm">
            <thead class="bg-slate-50">
              <tr>
                <th class="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Student Name</th>
                <th class="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Target Hostel</th>
                <th class="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Room Type</th>
                <th class="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Status</th>
                <th class="px-6 py-3 text-right text-xs font-semibold text-slate-500 uppercase">Pipeline Actions</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-200">
              {#each requests as req}
                <tr>
                  <td class="px-6 py-4 font-medium text-slate-900">{req.student?.name || 'N/A'}</td>
                  <td class="px-6 py-4">{req.hostel?.name}</td>
                  <td class="px-6 py-4 capitalize">{req.roomType}</td>
                  <td class="px-6 py-4">
                    <span class="px-2 py-0.5 rounded text-xs font-medium uppercase
                      {req.status === 'approved' ? 'bg-emerald-100 text-emerald-800' : 
                       req.status === 'rejected' ? 'bg-red-100 text-red-800' : 'bg-amber-100 text-amber-800'}">
                      {req.status}
                    </span>
                  </td>
                  <td class="px-6 py-4 text-right space-x-2">
                    {#if user.roles.includes('ADMIN') && req.status === 'pending'}
                      <button onclick={() => forwardRequest(req.id)} class="px-3 py-1 bg-slate-800 text-white rounded text-xs font-medium">Forward to Warden</button>
                    {:else if user.roles.includes('WARDEN') && req.status === 'forwarded'}
                      <button onclick={() => approveRequest(req.id)} class="px-3 py-1 bg-emerald-600 text-white rounded text-xs font-medium">Approve</button>
                      <button onclick={() => rejectRequest(req.id)} class="px-3 py-1 bg-red-600 text-white rounded text-xs font-medium">Reject</button>
                    {:else}
                      <span class="text-xs text-slate-400">Processed</span>
                    {/if}
                  </td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
      </div>
    {/if}

    <!-- Tab: Kitchen and Mess Management -->
    {#if activeTab === 'kitchen'}
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <!-- Stock inventory manager -->
        <div class="bg-white rounded-lg border border-slate-200 shadow-sm p-6 space-y-6">
          <h2 class="text-lg font-bold text-slate-800 uppercase tracking-wide border-b pb-2">Inventory Stock levels</h2>
          <div class="overflow-x-auto">
            <table class="min-w-full divide-y divide-slate-100 text-sm">
              <thead class="bg-slate-50">
                <tr>
                  <th class="px-4 py-2 text-left text-xs font-semibold text-slate-500 uppercase">Item</th>
                  <th class="px-4 py-2 text-left text-xs font-semibold text-slate-500 uppercase">In Stock</th>
                  <th class="px-4 py-2 text-left text-xs font-semibold text-slate-500 uppercase">Min Limit</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100">
                {#each inventory as item}
                  <tr>
                    <td class="px-4 py-3 font-semibold text-slate-700">{item.itemName}</td>
                    <td class="px-4 py-3 font-mono">{item.quantity} {item.unit}</td>
                    <td class="px-4 py-3 font-mono text-slate-400">{item.minThreshold} {item.unit}</td>
                  </tr>
                {/each}
              </tbody>
            </table>
          </div>

          <!-- Add Item/Audit Transaction -->
          {#if user.roles.includes('CHEF')}
            <div class="grid grid-cols-1 gap-4 border-t pt-4">
              <!-- Item creator -->
              <form onsubmit={addInventoryItem} class="space-y-3">
                <h3 class="font-bold text-xs uppercase text-slate-500">Register Raw Material Item</h3>
                <div class="grid grid-cols-3 gap-2">
                  <input bind:value={itemName} type="text" placeholder="Rice" required class="col-span-2 block w-full px-3 py-1.5 border border-slate-300 rounded text-sm focus:outline-none" />
                  <input bind:value={itemUnit} type="text" placeholder="kg" required class="block w-full px-3 py-1.5 border border-slate-300 rounded text-sm focus:outline-none" />
                </div>
                <input bind:value={itemMinThreshold} type="number" step="0.01" placeholder="Warning limit e.g. 10" class="block w-full px-3 py-1.5 border border-slate-300 rounded text-sm focus:outline-none" />
                <button type="submit" class="py-1.5 px-4 text-xs bg-slate-800 text-white rounded font-medium">Add Stock Item</button>
              </form>

              <!-- Audit Logger -->
              <form onsubmit={recordInventoryTx} class="space-y-3 border-t pt-4">
                <h3 class="font-bold text-xs uppercase text-slate-500">Log Stock Update (IN / OUT)</h3>
                <div class="grid grid-cols-2 gap-2">
                  <select bind:value={txItemId} required class="block w-full px-3 py-1.5 border border-slate-300 bg-white rounded text-sm focus:outline-none">
                    <option value="">Select Item</option>
                    {#each inventory as item}
                      <option value={item.id}>{item.itemName}</option>
                    {/each}
                  </select>
                  <select bind:value={txType} class="block w-full px-3 py-1.5 border border-slate-300 bg-white rounded text-sm focus:outline-none">
                    <option value="IN">Stock Added (IN)</option>
                    <option value="OUT">Stock Used (OUT)</option>
                  </select>
                </div>
                <input bind:value={txQty} type="number" step="0.01" placeholder="Quantity" required class="block w-full px-3 py-1.5 border border-slate-300 rounded text-sm focus:outline-none" />
                <input bind:value={txNotes} type="text" placeholder="Notes (Supplier/Meal)" class="block w-full px-3 py-1.5 border border-slate-300 rounded text-sm focus:outline-none" />
                <button type="submit" class="py-1.5 px-4 text-xs bg-slate-800 text-white rounded font-medium">Log Transaction</button>
              </form>
            </div>
          {/if}
        </div>

        <!-- Weekly Menu Editor -->
        <div class="bg-white rounded-lg border border-slate-200 shadow-sm p-6 space-y-4">
          <h2 class="text-lg font-bold text-slate-800 uppercase tracking-wide border-b pb-2">Weekly Mess Menu Editor</h2>
          <form onsubmit={saveMenu} class="space-y-4 max-h-[600px] overflow-y-auto pr-2">
            <!-- Monday -->
            <div class="p-3 bg-slate-50 border border-slate-200 rounded">
              <span class="font-bold uppercase text-slate-500 text-[10px]">Monday Menu</span>
              <div class="grid grid-cols-3 gap-2 mt-1">
                <input bind:value={menuMonBreakfast} type="text" placeholder="Breakfast" class="px-2 py-1 border border-slate-300 rounded text-xs" />
                <input bind:value={menuMonLunch} type="text" placeholder="Lunch" class="px-2 py-1 border border-slate-300 rounded text-xs" />
                <input bind:value={menuMonDinner} type="text" placeholder="Dinner" class="px-2 py-1 border border-slate-300 rounded text-xs" />
              </div>
            </div>
            <!-- Tuesday -->
            <div class="p-3 bg-slate-50 border border-slate-200 rounded">
              <span class="font-bold uppercase text-slate-500 text-[10px]">Tuesday Menu</span>
              <div class="grid grid-cols-3 gap-2 mt-1">
                <input bind:value={menuTueBreakfast} type="text" placeholder="Breakfast" class="px-2 py-1 border border-slate-300 rounded text-xs" />
                <input bind:value={menuTueLunch} type="text" placeholder="Lunch" class="px-2 py-1 border border-slate-300 rounded text-xs" />
                <input bind:value={menuTueDinner} type="text" placeholder="Dinner" class="px-2 py-1 border border-slate-300 rounded text-xs" />
              </div>
            </div>
            <!-- Wednesday -->
            <div class="p-3 bg-slate-50 border border-slate-200 rounded">
              <span class="font-bold uppercase text-slate-500 text-[10px]">Wednesday Menu</span>
              <div class="grid grid-cols-3 gap-2 mt-1">
                <input bind:value={menuWedBreakfast} type="text" placeholder="Breakfast" class="px-2 py-1 border border-slate-300 rounded text-xs" />
                <input bind:value={menuWedLunch} type="text" placeholder="Lunch" class="px-2 py-1 border border-slate-300 rounded text-xs" />
                <input bind:value={menuWedDinner} type="text" placeholder="Dinner" class="px-2 py-1 border border-slate-300 rounded text-xs" />
              </div>
            </div>
            <!-- Thursday -->
            <div class="p-3 bg-slate-50 border border-slate-200 rounded">
              <span class="font-bold uppercase text-slate-500 text-[10px]">Thursday Menu</span>
              <div class="grid grid-cols-3 gap-2 mt-1">
                <input bind:value={menuThuBreakfast} type="text" placeholder="Breakfast" class="px-2 py-1 border border-slate-300 rounded text-xs" />
                <input bind:value={menuThuLunch} type="text" placeholder="Lunch" class="px-2 py-1 border border-slate-300 rounded text-xs" />
                <input bind:value={menuThuDinner} type="text" placeholder="Dinner" class="px-2 py-1 border border-slate-300 rounded text-xs" />
              </div>
            </div>
            <!-- Friday -->
            <div class="p-3 bg-slate-50 border border-slate-200 rounded">
              <span class="font-bold uppercase text-slate-500 text-[10px]">Friday Menu</span>
              <div class="grid grid-cols-3 gap-2 mt-1">
                <input bind:value={menuFriBreakfast} type="text" placeholder="Breakfast" class="px-2 py-1 border border-slate-300 rounded text-xs" />
                <input bind:value={menuFriLunch} type="text" placeholder="Lunch" class="px-2 py-1 border border-slate-300 rounded text-xs" />
                <input bind:value={menuFriDinner} type="text" placeholder="Dinner" class="px-2 py-1 border border-slate-300 rounded text-xs" />
              </div>
            </div>
            <!-- Saturday -->
            <div class="p-3 bg-slate-50 border border-slate-200 rounded">
              <span class="font-bold uppercase text-slate-500 text-[10px]">Saturday Menu</span>
              <div class="grid grid-cols-3 gap-2 mt-1">
                <input bind:value={menuSatBreakfast} type="text" placeholder="Breakfast" class="px-2 py-1 border border-slate-300 rounded text-xs" />
                <input bind:value={menuSatLunch} type="text" placeholder="Lunch" class="px-2 py-1 border border-slate-300 rounded text-xs" />
                <input bind:value={menuSatDinner} type="text" placeholder="Dinner" class="px-2 py-1 border border-slate-300 rounded text-xs" />
              </div>
            </div>
            <!-- Sunday -->
            <div class="p-3 bg-slate-50 border border-slate-200 rounded">
              <span class="font-bold uppercase text-slate-500 text-[10px]">Sunday Menu</span>
              <div class="grid grid-cols-3 gap-2 mt-1">
                <input bind:value={menuSunBreakfast} type="text" placeholder="Breakfast" class="px-2 py-1 border border-slate-300 rounded text-xs" />
                <input bind:value={menuSunLunch} type="text" placeholder="Lunch" class="px-2 py-1 border border-slate-300 rounded text-xs" />
                <input bind:value={menuSunDinner} type="text" placeholder="Dinner" class="px-2 py-1 border border-slate-300 rounded text-xs" />
              </div>
            </div>

            <button type="submit" class="w-full py-2 bg-slate-800 text-white rounded font-medium text-sm">Save Menu Schedule</button>
          </form>
        </div>
      </div>
    {/if}
  </div>
{/if}
