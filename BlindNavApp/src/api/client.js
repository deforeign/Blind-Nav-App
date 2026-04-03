import axios from 'axios';

// CLIENT 1: The MacBook (Cloud/Database)
// Used for: Login, Signup, Emergency Contacts, Friends List
export const cloudClient = axios.create({
  baseURL: 'http://172.27.54.34:8000/api' 
});

// CLIENT 2: The Raspberry Pi (The Brain)
// Used for: Sending iPhone GPS and getting live Navigation Instructions
export const piClient = axios.create({
  baseURL: 'http://10.200.221.50:7000' 
});
