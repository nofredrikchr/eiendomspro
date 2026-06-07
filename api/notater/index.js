import { lagCrud } from '../_eiendom/db.js';
import { indexHandler } from '../_eiendom/handler.js';

export default indexHandler(lagCrud('notater'), 'notater');
