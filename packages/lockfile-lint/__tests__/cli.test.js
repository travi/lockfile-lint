'use strict'

const path = require('path')
// eslint-disable-next-line security/detect-child-process
const childProcess = require('child_process')
const cliExecPath = path.join(__dirname, '../bin/lockfile-lint.js')
const {ValidateHostManager, ValidateUrlManager, ValidateIntegrityManager} = require('../src/validators/index')

describe('CLI tests', () => {
  test('Running without parameters should display help', done => {
    const process = childProcess.spawn('node', [cliExecPath])

    let output = ''
    process.stderr.on('data', chunk => {
      output += chunk
    })

    process.stdout.on('close', () => {
      expect(output).toContain('Usage:')
      expect(output).toContain('Options:')
      expect(output).toContain('Examples:')
      done()
    })
  })

  test('Running without parameters should display a requirement for the p option', done => {
    const process = childProcess.spawn('node', [cliExecPath])

    let output = ''
    process.stderr.on('data', chunk => {
      output += chunk
    })

    process.stdout.on('close', () => {
      expect(output).toContain('Missing required argument: p')
      done()
    })
  })

  test('Linting a file that has wrong host should display an error message and use exit code 1', done => {
    const process = childProcess.spawn('node', [
      cliExecPath,
      '--type',
      'yarn',
      '--path',
      '__tests__/fixtures/yarn-only-http.lock',
      '--validate-https'
    ])

    let output = ''
    process.stderr.on('data', chunk => {
      output += chunk
    })

    process.stdout.on('close', exit => {
      expect(output).toContain(
        'detected invalid protocol for package: debug@^4.1.1\n    expected: https:\n    actual: http:\n'
      )
      expect(output).toContain(
        'detected invalid protocol for package: ms@^2.1.1\n    expected: https:\n    actual: http:\n'
      )
      expect(output).toContain('Error: security issues detected!')
      done()
    })
  })

  test('Linting a file that has wrong host should return exit code 1', done => {
    const process = childProcess.spawn('node', [
      cliExecPath,
      '--type',
      'yarn',
      '--path',
      '__tests__/fixtures/yarn-only-http.lock',
      '--validate-https'
    ])

    process.on('close', exitCode => {
      expect(exitCode).toBe(1)
      done()
    })
  })

  test('Linting a file that has incorrect package name in resolved url should return exit code 1', done => {
    const process = childProcess.spawn('node', [
      cliExecPath,
      '--type',
      'yarn',
      '--path',
      '__tests__/fixtures/yarn-incorrect-package-name.lock',
      '--validate-package-names',
      '--allowed-hosts',
      'yarn'
    ])

    let output = ''
    process.stderr.on('data', chunk => {
      output += chunk
    })

    process.on('close', exitCode => {
      expect(output.indexOf('detected resolved URL for package with a different name')).not.toBe(-1)
      expect(exitCode).toBe(1)
      done()
    })
  })

  test('Providing conflicting arguments should display an error', done => {
    const process = childProcess.spawn(cliExecPath, [
      '--type',
      'yarn',
      '--path',
      '__tests__/fixtures/yarn-only-http.lock',
      '--validate-https',
      '--allowed-schemes',
      'https:'
    ])

    let output = ''
    process.stderr.on('data', chunk => {
      output += chunk
    })

    process.stderr.on('close', _ => {
      expect(output.indexOf('Arguments o and validate-https are mutually exclusive')).not.toBe(-1)
      done()
    })
  })

  test('Allowed hosts and allowed urls flags should work together', done => {
    const process = childProcess.spawn(cliExecPath, [
      '--type',
      'yarn',
      '--path',
      '__tests__/fixtures/yarn-and-github-url.lock',
      '--allowed-hosts',
      'yarn',
      '--allowed-urls',
      'https://github.com/LN-Zap/bolt11#0492874ea9ced4ab49bf0f59a62368687f147247'
    ])

    let output = ''
    process.stderr.on('data', chunk => {
      output += chunk
    })

    process.stderr.on('close', _ => {
      expect(output).toBe('')
      done()
    })
  })

  test('default usage has output with symbols and color', done => {
    const process = childProcess.spawn('node', [
      cliExecPath,
      '--type',
      'yarn',
      '--path',
      '__tests__/fixtures/yarn-incorrect-package-name.lock',
      '--validate-package-names',
      '--allowed-hosts',
      'yarn'
    ])

    let output = ''
    process.stderr.on('data', chunk => {
      output += chunk
    })

    process.stderr.on('close', _ => {
      expect(output).toMatch(/[×✖]/)
      expect(output).toContain('\x1b[0m')
      done()
    })
  })

  test('When using --pretty formatting then output has symbols and color', done => {
    const process = childProcess.spawn('node', [
      cliExecPath,
      '--type',
      'yarn',
      '--path',
      '__tests__/fixtures/yarn-incorrect-package-name.lock',
      '--validate-package-names',
      '--allowed-hosts',
      'yarn',
      '--format',
      'pretty'
    ])

    let output = ''
    process.stderr.on('data', chunk => {
      output += chunk
    })

    process.stderr.on('close', _ => {
      expect(output).toMatch(/[×✖]/)
      expect(output).toContain('\x1b[0m')
      done()
    })
  })

  test('When using --plain formatting then output does not have symbols or color', done => {
    const process = childProcess.spawn('node', [
      cliExecPath,
      '--type',
      'yarn',
      '--path',
      '__tests__/fixtures/yarn-incorrect-package-name.lock',
      '--validate-package-names',
      '--allowed-hosts',
      'yarn',
      '--format',
      'plain'
    ])

    let output = ''
    process.stderr.on('data', chunk => {
      output += chunk
    })

    process.stderr.on('close', _ => {
      expect(output).not.toMatch(/[×✖]/)
      expect(output).not.toContain('\x1b[0m')
      done()
    })
  })

  describe('cosmiconfig integration', () => {
    it('options are loaded from cosmiconfig files', done => {
      const lintProcess = childProcess.spawn(cliExecPath, [], {
        cwd: path.join(__dirname, 'fixtures/valid-config')
      })

      let output = ''
      lintProcess.stderr.on('data', chunk => {
        output += chunk
      })

      lintProcess.on('close', exitCode => {
        console.log(output)
        expect(exitCode).toBe(0)
        done()
      })
    })

    it('command-line options take precedence', done => {
      const lintProcess = childProcess.spawn(cliExecPath, ['-p', '../yarn-only-http.lock'], {
        cwd: path.join(__dirname, 'fixtures/valid-config')
      })

      lintProcess.on('close', exitCode => {
        expect(exitCode).toBe(1)
        done()
      })
    })

    it('invalid config files are ignored', done => {
      const lintProcess = childProcess.spawn(
        cliExecPath,
        ['-p', '../yarn-only-https.lock', '--type', 'yarn', '--validate-https'],
        {
          cwd: path.join(__dirname, 'fixtures/invalid-config'),
          env: Object.assign({}, process.env, {DEBUG: 'lockfile-lint'})
        }
      )

      let stderr = ''
      lintProcess.stderr.on('data', chunk => {
        stderr += chunk
      })

      lintProcess.on('close', exitCode => {
        expect(stderr).toEqual(
          expect.stringMatching(/error encountered while loading configuration/i)
        )
        expect(exitCode).toBe(0)
        done()
      })
    })
  })
})

describe('Validator managers:', () => {
  it('Host manager should work together with URL manager', () => {
    const result = ValidateHostManager({
      path: '__tests__/fixtures/yarn-and-github-url.lock',
      type: 'yarn',
      validatorValues: ['yarn'],
      validatorOptions: {
        allowedUrls: ['https://github.com/LN-Zap/bolt11#0492874ea9ced4ab49bf0f59a62368687f147247']
      }
    })
    expect(result).toEqual({
      type: 'success',
      errors: []
    })
  })

  it('Host manager should return errors for lock file with packages on other hosts', () => {
    const result = ValidateHostManager({
      path: '__tests__/fixtures/yarn-and-github-url.lock',
      type: 'yarn',
      validatorValues: ['yarn']
    })
    expect(result).toEqual({
      type: 'error',
      errors: [
        {
          message:
            'detected invalid host(s) for package: bolt11@https://github.com/LN-Zap/bolt11#0492874ea9ced4ab49bf0f59a62368687f147247\n    expected: registry.yarnpkg.com\n    actual: github.com\n',
          package:
            'bolt11@https://github.com/LN-Zap/bolt11#0492874ea9ced4ab49bf0f59a62368687f147247'
        }
      ]
    })
  })

  it('URL manager should return errors for lock file with packages on other URLs', () => {
    const result = ValidateUrlManager({
      path: '__tests__/fixtures/yarn-and-github-url.lock',
      type: 'yarn',
      validatorValues: ['https://github.com/LN-Zap/bolt11#0492874ea9ced4ab49bf0f59a62368687f147247']
    })

    expect(result).toEqual({
      type: 'error',
      errors: [
        {
          message:
            'detected invalid url(s) for package: ms@^2.1.1\n    expected: https://github.com/LN-Zap/bolt11#0492874ea9ced4ab49bf0f59a62368687f147247\n    actual: https://registry.yarnpkg.com/ms/-/ms-2.1.2.tgz#d09d1f357b443f493382a8eb3ccd183872ae6009\n',
          package: 'ms@^2.1.1'
        }
      ]
    })
  })
  it('Integrity manager should return errors for lock file with packages with sha1 integrity', () => {
    const result = ValidateIntegrityManager({
      path: '__tests__/fixtures/package-lock-sha1.json',
      type: 'npm',
      validatorValues: ['https://github.com/LN-Zap/bolt11#0492874ea9ced4ab49bf0f59a62368687f147247']
    })

    expect(result).toEqual({
      type: 'error',
      errors: [
        {
          message:
            'detected invalid integrity hash type for package: typescript@4.8.3-4b39c20edf186cd85bb485386ba7d48590c3bf0c\n    expected: sha512\n    actual: sha1-1ZNEUixLxGSmWnMKxpUAf9tm3Yg=\n',
          package: 'typescript@4.8.3-4b39c20edf186cd85bb485386ba7d48590c3bf0c'
        }
      ]
    })
  })
})
