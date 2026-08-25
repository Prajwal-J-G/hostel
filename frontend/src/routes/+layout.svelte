<script lang="ts">
  import '../app.css';
  import { onMount } from 'svelte';
  import { userStore, initializeAuth, clearAuth, setAuth } from '$lib/store';
  import { api } from '$lib/api';

  let { children } = $props();

  let user = $state<any>(null);
  let isRegistering = $state(false);

  // Form states
  let email = $state('');
  let password = $state('');
  let name = $state('');
  let gender = $state('male');
  let role = $state('STUDENT');
  let usn = $state('');
  let authError = $state('');
  let successMsg = $state('');

  onMount(() => {
    initializeAuth();
    userStore.subscribe((val) => {
      user = val;
    });
  });

  async function handleLogin(e: SubmitEvent) {
    e.preventDefault();
    authError = '';
    try {
      const res = await api.login({ email, password });
      setAuth(res.token, res.user);
      email = '';
      password = '';
    } catch (err: any) {
      authError = err.message;
    }
  }

  async function handleRegister(e: SubmitEvent) {
    e.preventDefault();
    authError = '';
    successMsg = '';
    try {
      await api.register({
        name,
        email,
        password,
        gender,
        role,
        usn: role === 'STUDENT' ? usn : undefined
      });
      successMsg = 'Registration successful! Please login.';
      isRegistering = false;
      // Clear fields
      name = '';
      email = '';
      password = '';
      usn = '';
    } catch (err: any) {
      authError = err.message;
    }
  }
</script>

<svelte:head>
  <title>RNSIT Hostel ERP</title>
</svelte:head>

{#if !user}
  <!-- Auth Screen -->
  <div class="min-h-screen bg-slate-100 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
    <div class="max-w-md w-full space-y-8 bg-white p-8 rounded-lg border border-slate-200 shadow-sm">
      <div>
        <h2 class="text-center text-3xl font-extrabold text-slate-900">
          RNSIT Hostel Management
        </h2>
        <p class="mt-2 text-center text-sm text-slate-600">
          {#if isRegistering}
            Create your staff or student account
          {:else}
            Sign in to access the hostel ERP ledger
          {/if}
        </p>
      </div>

      {#if authError}
        <div class="bg-red-50 border-l-4 border-red-400 p-4 text-sm text-red-700 rounded">
          {authError}
        </div>
      {/if}

      {#if successMsg}
        <div class="bg-emerald-50 border-l-4 border-emerald-400 p-4 text-sm text-emerald-700 rounded">
          {successMsg}
        </div>
      {/if}

      {#if isRegistering}
        <!-- Register Form -->
        <form class="mt-8 space-y-4" onsubmit={handleRegister}>
          <div>
            <label for="reg-name" class="block text-xs font-semibold text-slate-500 uppercase">Full Name</label>
            <input id="reg-name" bind:value={name} type="text" required class="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-slate-500" />
          </div>
          <div>
            <label for="reg-email" class="block text-xs font-semibold text-slate-500 uppercase">Email address</label>
            <input id="reg-email" bind:value={email} type="email" required class="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-slate-500" />
          </div>
          <div>
            <label for="reg-password" class="block text-xs font-semibold text-slate-500 uppercase">Password</label>
            <input id="reg-password" bind:value={password} type="password" required class="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-slate-500" />
          </div>
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label for="reg-gender" class="block text-xs font-semibold text-slate-500 uppercase">Gender</label>
              <select id="reg-gender" bind:value={gender} class="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md text-sm bg-white focus:outline-none focus:ring-1 focus:ring-slate-500">
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label for="reg-role" class="block text-xs font-semibold text-slate-500 uppercase">Role</label>
              <select id="reg-role" bind:value={role} class="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md text-sm bg-white focus:outline-none focus:ring-1 focus:ring-slate-500">
                <option value="STUDENT">Student</option>
                <option value="WARDEN">Warden</option>
                <option value="CHEF">Chef / Mess Manager</option>
                <option value="ADMIN">Admin</option>
              </select>
            </div>
          </div>
          {#if role === 'STUDENT'}
            <div>
              <label for="reg-usn" class="block text-xs font-semibold text-slate-500 uppercase">Student USN</label>
              <input id="reg-usn" bind:value={usn} type="text" required class="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md text-sm uppercase focus:outline-none focus:ring-1 focus:ring-slate-500" />
            </div>
          {/if}

          <div class="pt-4">
            <button type="submit" class="w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-slate-800 hover:bg-slate-700 focus:outline-none">
              Register Account
            </button>
          </div>
          <div class="text-center text-sm">
            <button type="button" class="text-slate-600 hover:underline" onclick={() => isRegistering = false}>
              Already have an account? Sign In
            </button>
          </div>
        </form>
      {:else}
        <!-- Login Form -->
        <form class="mt-8 space-y-6" onsubmit={handleLogin}>
          <div class="rounded-md space-y-4">
            <div>
              <label for="email" class="block text-xs font-semibold text-slate-500 uppercase">Email address</label>
              <input id="email" bind:value={email} type="email" required class="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-slate-500" />
            </div>
            <div>
              <label for="password" class="block text-xs font-semibold text-slate-500 uppercase">Password</label>
              <input id="password" bind:value={password} type="password" required class="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-slate-500" />
            </div>
          </div>

          <div>
            <button type="submit" class="w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-slate-800 hover:bg-slate-700 focus:outline-none">
              Sign In
            </button>
          </div>
          <div class="text-center text-sm">
            <button type="button" class="text-slate-600 hover:underline" onclick={() => isRegistering = true}>
              Don't have an account? Register
            </button>
          </div>
        </form>
      {/if}
    </div>
  </div>
{:else}
  <!-- ERP Workspace Layout -->
  <div class="flex h-screen bg-slate-50">
    <!-- Sidebar -->
    <aside class="w-64 bg-slate-900 text-slate-300 flex flex-col">
      <div class="h-16 flex items-center px-6 border-b border-slate-800">
        <span class="text-xl font-bold text-white tracking-wider">RNSIT HOSTEL</span>
      </div>
      <div class="p-4 border-b border-slate-800">
        <p class="text-xs font-semibold text-slate-500 uppercase">Signed in as</p>
        <p class="text-sm font-bold text-white truncate">{user.name}</p>
        <span class="inline-flex mt-1 items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-800 text-slate-300 uppercase">
          {user.roles[0]}
        </span>
      </div>
      <nav class="flex-1 px-4 py-4 space-y-1 overflow-y-auto">
        <a href="/" class="flex items-center px-3 py-2 text-sm font-medium rounded-md text-white bg-slate-800">
          ERP Dashboard
        </a>
      </nav>
      <div class="p-4 border-t border-slate-800">
        <button onclick={clearAuth} class="w-full flex items-center justify-center px-4 py-2 border border-slate-700 rounded-md text-sm font-medium text-slate-300 hover:bg-slate-800 hover:text-white transition">
          Log Out
        </button>
      </div>
    </aside>

    <!-- Main Workspace -->
    <div class="flex-1 flex flex-col overflow-hidden">
      <!-- Top header -->
      <header class="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 shadow-sm">
        <h1 class="text-lg font-semibold text-slate-800 uppercase tracking-wide">Command Center</h1>
        <div class="flex items-center space-x-4">
          <span class="text-sm text-slate-500">{user.email}</span>
        </div>
      </header>

      <!-- Content viewport -->
      <main class="flex-1 overflow-y-auto p-8">
        <div class="max-w-7xl mx-auto">
          {@render children?.()}
        </div>
      </main>
    </div>
  </div>
{/if}
