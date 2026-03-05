import { addCustomer, getCustomers } from './storage';

// Simple auth helper for components that don't use the hook directly
// Uses the same storage key as the Context

const SESSION_KEY = 'nextiom_user_session';

export const getCurrentUser = () => {
  try {
    const item = localStorage.getItem(SESSION_KEY);
    return item ? JSON.parse(item) : null;
  } catch (e) {
    return null;
  }
};

export const logout = () => {
  localStorage.removeItem(SESSION_KEY);
  window.location.href = '/';
};

export const register = async (email, password, fullName) => {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 1000));

  const customers = getCustomers();
  if (customers.find(c => c.email === email)) {
    return { success: false, error: 'Email already registered' };
  }

  // Create new customer
  const newCustomer = {
    name: fullName,
    email: email,
    status: 'active',
    user_id: 'user_' + Date.now(), // Mock user ID
    joined_at: new Date().toISOString()
  };

  const createdCustomer = addCustomer(newCustomer);

  // Auto login
  const sessionUser = {
    id: createdCustomer.user_id,
    email: createdCustomer.email,
    name: createdCustomer.name,
    role: 'customer'
  };
  
  localStorage.setItem(SESSION_KEY, JSON.stringify(sessionUser));

  return { success: true, user: sessionUser };
};