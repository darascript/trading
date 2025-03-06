const StartForm = ({ setStartDate, setTimeInterval, setHasStarted }) => {
    return (
      <div>
        <input
          type="text"
          placeholder="Enter Start Date (YYYY-MM-DD)"
          onChange={(e) => setStartDate(e.target.value)}
          style={{ padding: '8px', marginBottom: '10px' }}
        />
        <select
          onChange={(e) => setTimeInterval(e.target.value)}
          style={{ padding: '8px', marginBottom: '10px' }}
        >
          <option value="1">1 Minute</option>
          <option value="5">5 Minutes</option>
          <option value="15">15 Minutes</option>
          <option value="30">30 Minutes</option>
          <option value="60">1 Hour</option>
        </select>
        <button onClick={() => setHasStarted(true)} style={{ padding: '8px', marginLeft: '10px' }}>
          Load Historical Data
        </button>
      </div>
    );
  };
  
  export default StartForm;
  