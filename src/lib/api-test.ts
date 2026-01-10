// API Test Utility
// Bu dosya API endpoint'lerini test etmek için kullanılabilir

export interface ApiTestResult {
    endpoint: string
    method: string
    status: number
    success: boolean
    error?: string
    responseTime: number
}

export class ApiTester {
    private baseUrl: string

    constructor(baseUrl: string = 'http://localhost:3000') {
        this.baseUrl = baseUrl
    }

    async testEndpoint(
        endpoint: string,
        method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
        body?: any,
        headers?: Record<string, string>
    ): Promise<ApiTestResult> {
        const startTime = Date.now()

        try {
            const response = await fetch(`${this.baseUrl}${endpoint}`, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    ...headers
                },
                body: body ? JSON.stringify(body) : undefined
            })

            const responseTime = Date.now() - startTime
            const responseData = await response.json()

            return {
                endpoint,
                method,
                status: response.status,
                success: response.ok,
                error: response.ok ? undefined : responseData.error || 'Unknown error',
                responseTime
            }
        } catch (error) {
            return {
                endpoint,
                method,
                status: 0,
                success: false,
                error: error instanceof Error ? error.message : 'Network error',
                responseTime: Date.now() - startTime
            }
        }
    }

    // Test scenarios
    async testErrorScenarios() {
        const tests = [
            // 400 Bad Request tests
            {
                name: 'Invalid product ID format',
                endpoint: '/api/products/invalid-id',
                method: 'GET' as const,
                expectedStatus: 400
            },
            {
                name: 'Invalid cart item data',
                endpoint: '/api/cart',
                method: 'POST' as const,
                body: { productId: '', quantity: 0 },
                expectedStatus: 400
            },
            {
                name: 'Invalid login data',
                endpoint: '/api/auth/login',
                method: 'POST' as const,
                body: { email: 'invalid-email', password: '' },
                expectedStatus: 400
            },

            // 401 Unauthorized tests
            {
                name: 'Missing authorization header',
                endpoint: '/api/orders',
                method: 'GET' as const,
                expectedStatus: 401
            },
            {
                name: 'Invalid token',
                endpoint: '/api/orders',
                method: 'GET' as const,
                headers: { 'Authorization': 'Bearer invalid-token' },
                expectedStatus: 401
            },

            // 404 Not Found tests
            {
                name: 'Non-existent product',
                endpoint: '/api/products/non-existent-id',
                method: 'GET' as const,
                expectedStatus: 404
            },
            {
                name: 'Non-existent order',
                endpoint: '/api/orders/non-existent-id',
                method: 'GET' as const,
                expectedStatus: 404
            },

            // 403 Forbidden tests
            {
                name: 'Admin access without admin role',
                endpoint: '/api/admin/products',
                method: 'GET' as const,
                headers: { 'Authorization': 'Bearer customer-token' },
                expectedStatus: 403
            }
        ]

        const results = []
        for (const test of tests) {
            const result = await this.testEndpoint(
                test.endpoint,
                test.method,
                test.body,
                test.headers
            )

            results.push({
                ...result,
                testName: test.name,
                expectedStatus: test.expectedStatus,
                passed: result.status === test.expectedStatus
            })
        }

        return results
    }

    // Test successful scenarios
    async testSuccessScenarios() {
        const tests = [
            {
                name: 'Get products list',
                endpoint: '/api/products',
                method: 'GET' as const,
                expectedStatus: 200
            },
            {
                name: 'Get categories',
                endpoint: '/api/categories',
                method: 'GET' as const,
                expectedStatus: 200
            },
            {
                name: 'Contact form submission',
                endpoint: '/api/contact',
                method: 'POST' as const,
                body: {
                    name: 'Test User',
                    email: 'test@example.com',
                    subject: 'Test Subject',
                    message: 'Test message content'
                },
                expectedStatus: 200
            }
        ]

        const results = []
        for (const test of tests) {
            const result = await this.testEndpoint(
                test.endpoint,
                test.method,
                test.body
            )

            results.push({
                ...result,
                testName: test.name,
                expectedStatus: test.expectedStatus,
                passed: result.status === test.expectedStatus
            })
        }

        return results
    }

    // Rate limiting test
    async testRateLimiting() {
        const results = []
        const endpoint = '/api/products'

        // Send 101 requests (limit is 100)
        for (let i = 0; i < 101; i++) {
            const result = await this.testEndpoint(endpoint, 'GET')
            results.push(result)

            if (result.status === 429) {
                break
            }
        }

        return results
    }
}

// Test runner
export async function runApiTests() {
    const tester = new ApiTester()

    console.log('🧪 Running API Error Tests...')
    const errorTests = await tester.testErrorScenarios()

    console.log('✅ Running API Success Tests...')
    const successTests = await tester.testSuccessScenarios()

    console.log('🚦 Testing Rate Limiting...')
    const rateLimitTests = await tester.testRateLimiting()

    return {
        errorTests,
        successTests,
        rateLimitTests,
        summary: {
            totalTests: errorTests.length + successTests.length,
            passedTests: errorTests.filter(t => t.passed).length + successTests.filter(t => t.passed).length,
            failedTests: errorTests.filter(t => !t.passed).length + successTests.filter(t => !t.passed).length
        }
    }
}
