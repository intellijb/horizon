#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Parse command line arguments
const resultsDir = process.argv[2] || 'comparison-results';

// Helper function to parse CSV
function parseCSV(filename) {
    if (!fs.existsSync(filename)) {
        return [];
    }
    
    const content = fs.readFileSync(filename, 'utf-8');
    const lines = content.trim().split('\n');
    const headers = lines[0].split(',');
    
    return lines.slice(1).map(line => {
        const values = line.split(',');
        const row = {};
        headers.forEach((header, i) => {
            row[header.trim()] = values[i]?.trim();
        });
        return row;
    });
}

// Helper function to calculate statistics
function calculateStats(data, field) {
    const values = data.map(row => parseFloat(row[field])).filter(v => !isNaN(v));
    if (values.length === 0) return { avg: 0, max: 0, min: 0, p95: 0 };
    
    values.sort((a, b) => a - b);
    const sum = values.reduce((a, b) => a + b, 0);
    const avg = sum / values.length;
    const max = Math.max(...values);
    const min = Math.min(...values);
    const p95Index = Math.floor(values.length * 0.95);
    const p95 = values[p95Index] || max;
    
    return { avg, max, min, p95 };
}

// Load test results
function loadTestResults(filename) {
    if (!fs.existsSync(filename)) {
        console.error(`File not found: ${filename}`);
        return null;
    }
    return JSON.parse(fs.readFileSync(filename, 'utf-8'));
}

// Analyze metrics
function analyzeMetrics(csvFile, label) {
    const data = parseCSV(csvFile);
    
    if (data.length === 0) {
        return {
            label,
            error: 'No metrics data available'
        };
    }
    
    // Group by container
    const containers = {};
    data.forEach(row => {
        if (!containers[row.container]) {
            containers[row.container] = [];
        }
        containers[row.container].push(row);
    });
    
    // Calculate stats for each container
    const containerStats = {};
    for (const [container, rows] of Object.entries(containers)) {
        containerStats[container] = {
            cpu: calculateStats(rows, 'cpu_percent'),
            memory: calculateStats(rows, 'memory_mb'),
            samples: rows.length
        };
    }
    
    // Calculate totals
    const totalCPU = data.map(row => parseFloat(row.cpu_percent) || 0);
    const totalMemory = data.map(row => parseFloat(row.memory_mb) || 0);
    
    // Group by timestamp for aggregate metrics
    const timestampGroups = {};
    data.forEach(row => {
        if (!timestampGroups[row.timestamp]) {
            timestampGroups[row.timestamp] = [];
        }
        timestampGroups[row.timestamp].push(row);
    });
    
    // Calculate aggregate metrics per timestamp
    const aggregateMetrics = Object.entries(timestampGroups).map(([timestamp, rows]) => {
        const cpuSum = rows.reduce((sum, row) => sum + (parseFloat(row.cpu_percent) || 0), 0);
        const memSum = rows.reduce((sum, row) => sum + (parseFloat(row.memory_mb) || 0), 0);
        return { timestamp, cpu: cpuSum, memory: memSum };
    });
    
    return {
        label,
        containers: containerStats,
        aggregate: {
            cpu: calculateStats(aggregateMetrics, 'cpu'),
            memory: calculateStats(aggregateMetrics, 'memory'),
            duration_seconds: data.length > 0 ? data.length : 0
        }
    };
}

// Main analysis
console.log('\n📊 SSE Implementation Performance Comparison');
console.log('=' .repeat(60));

// Load test results
const goResults = loadTestResults(path.join(resultsDir, 'go-test-results.json'));
const nodeResults = loadTestResults(path.join(resultsDir, 'node-test-results.json'));

// Analyze resource metrics
const goMetrics = analyzeMetrics(path.join(resultsDir, 'go-metrics.csv'), 'Go');
const nodeMetrics = analyzeMetrics(path.join(resultsDir, 'node-metrics.csv'), 'Node.js');

// Display test results comparison
console.log('\n📈 Load Test Results');
console.log('-'.repeat(60));

if (goResults && nodeResults) {
    const comparison = {
        'Total Clients': {
            Go: goResults.summary.total_clients,
            'Node.js': nodeResults.summary.total_clients
        },
        'Success Rate': {
            Go: goResults.summary.success_rate,
            'Node.js': nodeResults.summary.success_rate
        },
        'Avg Response Time': {
            Go: goResults.summary.avg_response_time,
            'Node.js': nodeResults.summary.avg_response_time
        },
        'Messages/sec': {
            Go: goResults.summary.messages_per_second?.toFixed(2),
            'Node.js': nodeResults.summary.messages_per_second?.toFixed(2)
        },
        'Requests/sec': {
            Go: goResults.summary.requests_per_second?.toFixed(2),
            'Node.js': nodeResults.summary.requests_per_second?.toFixed(2)
        },
        'Test Duration': {
            Go: goResults.test_duration,
            'Node.js': nodeResults.test_duration
        }
    };
    
    console.table(comparison);
}

// Display resource usage comparison
console.log('\n💻 Resource Usage (Aggregate)');
console.log('-'.repeat(60));

const resourceComparison = {
    'CPU - Average (%)': {
        Go: goMetrics.aggregate?.cpu?.avg?.toFixed(2) || 'N/A',
        'Node.js': nodeMetrics.aggregate?.cpu?.avg?.toFixed(2) || 'N/A'
    },
    'CPU - Peak (%)': {
        Go: goMetrics.aggregate?.cpu?.max?.toFixed(2) || 'N/A',
        'Node.js': nodeMetrics.aggregate?.cpu?.max?.toFixed(2) || 'N/A'
    },
    'CPU - P95 (%)': {
        Go: goMetrics.aggregate?.cpu?.p95?.toFixed(2) || 'N/A',
        'Node.js': nodeMetrics.aggregate?.cpu?.p95?.toFixed(2) || 'N/A'
    },
    'Memory - Average (MB)': {
        Go: goMetrics.aggregate?.memory?.avg?.toFixed(2) || 'N/A',
        'Node.js': nodeMetrics.aggregate?.memory?.avg?.toFixed(2) || 'N/A'
    },
    'Memory - Peak (MB)': {
        Go: goMetrics.aggregate?.memory?.max?.toFixed(2) || 'N/A',
        'Node.js': nodeMetrics.aggregate?.memory?.max?.toFixed(2) || 'N/A'
    },
    'Memory - P95 (MB)': {
        Go: goMetrics.aggregate?.memory?.p95?.toFixed(2) || 'N/A',
        'Node.js': nodeMetrics.aggregate?.memory?.p95?.toFixed(2) || 'N/A'
    }
};

console.table(resourceComparison);

// Calculate efficiency metrics
console.log('\n⚡ Efficiency Metrics');
console.log('-'.repeat(60));

if (goResults && nodeResults && goMetrics.aggregate && nodeMetrics.aggregate) {
    const goEfficiency = {
        'Messages per CPU %': (goResults.summary.messages_per_second / (goMetrics.aggregate.cpu.avg || 1)).toFixed(2),
        'Messages per MB': (goResults.summary.messages_per_second / (goMetrics.aggregate.memory.avg || 1)).toFixed(2),
        'Requests per CPU %': (goResults.summary.requests_per_second / (goMetrics.aggregate.cpu.avg || 1)).toFixed(2),
        'Requests per MB': (goResults.summary.requests_per_second / (goMetrics.aggregate.memory.avg || 1)).toFixed(2)
    };
    
    const nodeEfficiency = {
        'Messages per CPU %': (nodeResults.summary.messages_per_second / (nodeMetrics.aggregate.cpu.avg || 1)).toFixed(2),
        'Messages per MB': (nodeResults.summary.messages_per_second / (nodeMetrics.aggregate.memory.avg || 1)).toFixed(2),
        'Requests per CPU %': (nodeResults.summary.requests_per_second / (nodeMetrics.aggregate.cpu.avg || 1)).toFixed(2),
        'Requests per MB': (nodeResults.summary.requests_per_second / (nodeMetrics.aggregate.memory.avg || 1)).toFixed(2)
    };
    
    const efficiencyComparison = {
        'Messages per CPU %': { Go: goEfficiency['Messages per CPU %'], 'Node.js': nodeEfficiency['Messages per CPU %'] },
        'Messages per MB': { Go: goEfficiency['Messages per MB'], 'Node.js': nodeEfficiency['Messages per MB'] },
        'Requests per CPU %': { Go: goEfficiency['Requests per CPU %'], 'Node.js': nodeEfficiency['Requests per CPU %'] },
        'Requests per MB': { Go: goEfficiency['Requests per MB'], 'Node.js': nodeEfficiency['Requests per MB'] }
    };
    
    console.table(efficiencyComparison);
}

// Save detailed report
const report = {
    timestamp: new Date().toISOString(),
    test_config: {
        clients: goResults?.test_config?.num_clients || nodeResults?.test_config?.num_clients,
        go_url: goResults?.test_config?.server_url,
        node_url: nodeResults?.test_config?.server_url
    },
    results: {
        go: goResults?.summary,
        node: nodeResults?.summary
    },
    resources: {
        go: goMetrics,
        node: nodeMetrics
    },
    comparison: {
        resources: resourceComparison
    }
};

fs.writeFileSync(
    path.join(resultsDir, 'comparison-report.json'),
    JSON.stringify(report, null, 2)
);

console.log('\n✅ Detailed report saved to comparison-report.json');

// Summary
console.log('\n📋 Summary');
console.log('-'.repeat(60));

if (goResults && nodeResults) {
    const goMsgSec = goResults.summary.messages_per_second || 0;
    const nodeMsgSec = nodeResults.summary.messages_per_second || 0;
    const throughputWinner = goMsgSec > nodeMsgSec ? 'Go' : 'Node.js';
    const throughputRatio = Math.max(goMsgSec, nodeMsgSec) / Math.min(goMsgSec, nodeMsgSec);
    
    console.log(`🏆 Throughput Winner: ${throughputWinner} (${throughputRatio.toFixed(2)}x faster)`);
    
    if (goMetrics.aggregate && nodeMetrics.aggregate) {
        const goCPU = goMetrics.aggregate.cpu.avg || 0;
        const nodeCPU = nodeMetrics.aggregate.cpu.avg || 0;
        const cpuWinner = goCPU < nodeCPU ? 'Go' : 'Node.js';
        const cpuRatio = Math.max(goCPU, nodeCPU) / Math.min(goCPU, nodeCPU);
        
        console.log(`🏆 CPU Efficiency: ${cpuWinner} (${cpuRatio.toFixed(2)}x more efficient)`);
        
        const goMem = goMetrics.aggregate.memory.avg || 0;
        const nodeMem = nodeMetrics.aggregate.memory.avg || 0;
        const memWinner = goMem < nodeMem ? 'Go' : 'Node.js';
        const memRatio = Math.max(goMem, nodeMem) / Math.min(goMem, nodeMem);
        
        console.log(`🏆 Memory Efficiency: ${memWinner} (${memRatio.toFixed(2)}x more efficient)`);
    }
}