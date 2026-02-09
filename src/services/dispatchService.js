// src/services/dispatchService.js
const API_BASE_URL = 'https://kingslist.pro/app/default/api';

export const fetchDispatchBatch = async (dmsg_id) => {
    try {
      const response = await fetch(`${API_BASE_URL}/getDispatchBatch.php?dmsg_id=${dmsg_id}`, {
        credentials: 'include'
      });
  
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
  
      // Read response as text first to debug potential issues
      const textResponse = await response.text();
      console.log("Raw API Response:", textResponse);
  
      // Parse the response as JSON
      const jsonData = JSON.parse(textResponse);
      
      if (!jsonData?.data?.messages?.length) {
        throw new Error('No messages available in this batch');
      }
  
      return jsonData.data;
      
    } catch (error) {
      console.error('Failed to fetch dispatch batch:', error);
      throw error;
    }
  };
  

export const prepareMessagesForDispatch = (batchData) => {
  return batchData.messages.map(msg => ({
    ...msg,
    processed: false,
    retries: 0,
    status: 'pending'
  }));
};