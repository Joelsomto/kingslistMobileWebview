const [processedMessages, setProcessedMessages] = useState(new Set());
const [retryCounts, setRetryCounts] = useState({});

const processMessagesWithRetry = useCallback(async (messages, dmsg_id, isRetry) => {
  const RATE_LIMIT = {
    MESSAGE_DELAY_MS: 2000,
    BATCH_SIZE: 5,
    MAX_RETRY_ATTEMPTS: 2
  };

  let remainingMessages = [...messages];
  let attempt = 0;

  while (remainingMessages.length > 0 && attempt < RATE_LIMIT.MAX_RETRY_ATTEMPTS) {
    const currentBatch = remainingMessages.slice(0, RATE_LIMIT.BATCH_SIZE);
    remainingMessages = remainingMessages.slice(RATE_LIMIT.BATCH_SIZE);

    // Process batch with token recovery
    const results = await Promise.allSettled(
      currentBatch.map(msg => 
        sendMessageWithTokenRecovery(msg, dmsg_id)
          .then(() => ({ success: true, msg }))
          .catch(e => ({ success: false, msg, error: e }))
      )
    );

    // Update processed messages and retry counts
    const successful = results.filter(r => r.value.success);
    const failed = results.filter(r => !r.value.success);

    setProcessedMessages(prev => {
      const newSet = new Set(prev);
      successful.forEach(({ value }) => newSet.add(value.msg.kc_id));
      return newSet;
    });

    setRetryCounts(prev => {
      const newCounts = { ...prev };
      currentBatch.forEach(msg => {
        newCounts[msg.kc_id] = (newCounts[msg.kc_id] || 0) + 1;
      });
      return newCounts;
    });

    // Update progress from metrics
    const metrics = getMessageMetrics();
    updateProgress(prev => ({
      ...prev,
      current: metrics.totalProcessed,
      success: metrics.successCount,
      failed: metrics.errorCount
    }));

    // Prepare for next attempt
    if (failed.length > 0) {
      remainingMessages = [...remainingMessages, ...failed.map(f => f.value.msg)];
    }

    attempt++;
    if (remainingMessages.length > 0) {
      await new Promise(res => setTimeout(res, RATE_LIMIT.MESSAGE_DELAY_MS));
    }
  }
}, []);

const handleDispatch = useCallback(async (dmsg_id, isRetry = false) => {
  setError("");
  setDispatching(true);
  
  if (!isRetry) {
    updateProgress(() => ({ current: 0, total: 0, success: 0, failed: 0 }));
    setRetryCounts({});
    setProcessedMessages(new Set());
    resetMessageMetrics();
  }

  try {
    const batchData = await fetchDispatchBatch(dmsg_id);
    let messages = prepareMessagesForDispatch(batchData);

    // If this is a retry, only process messages that had errors and weren't processed
    if (isRetry) {
      const metrics = getMessageMetrics();
      if (metrics.errorCount === 0) {
        throw new Error("No failed messages to retry");
      }
      messages = messages.filter(msg => 
        !processedMessages.has(msg.kc_id) && 
        (retryCounts[msg.kc_id] || 0) < 2
      );
    }

    messages = messages.map(msg => ({
      ...msg,
      body: msg.body
        .replace(/<kc_username>/g, msg.username)
        .replace(/<fullname>/g, msg.fullname),
    }));

    updateProgress(prev => ({ 
      ...prev, 
      total: isRetry ? messages.length : messages.length 
    }));

    // Process messages with retry logic
    await processMessagesWithRetry(messages, dmsg_id, isRetry);

    const finalStatus = await updateDispatchStatus(dmsg_id);
    if (!finalStatus.success) throw new Error("Update failed");

    sessionStorage.setItem(`dispatch_status_${dmsg_id}`, "completed");
    sessionStorage.setItem(`dispatch_analytics_${dmsg_id}`, JSON.stringify({
      success: getMessageMetrics().successCount,
      failed: getMessageMetrics().errorCount,
      retries: Object.values(retryCounts).filter(c => c > 1).length
    }));

    const newUrl = new URL(window.location.href);
    newUrl.searchParams.set("start_dispatch", "2");
    window.history.pushState({}, "", newUrl.toString());

  } catch (err) {
    setError(`Dispatch error: ${err.message}`);
  } finally {
    setDispatching(false);
  }
}, [accessToken, updateDispatchStatus, processMessagesWithRetry, processedMessages, retryCounts]);