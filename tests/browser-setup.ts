import * as chai from 'chai';
import sinonChai from 'sinon-chai';

// Bundle current ESM assertion packages; do not depend on the obsolete
// karma-sinon-chai adapter's global/CJS distribution paths.
chai.use(sinonChai);
