import { lagCrud } from '../_eiendom/db.js';
import { idHandler } from '../_eiendom/handler.js';

export default idHandler(lagCrud('notater'));
