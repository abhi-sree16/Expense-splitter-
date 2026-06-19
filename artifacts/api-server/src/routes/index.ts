import { Router, type IRouter } from "express";
import healthRouter from "./health";
import groupsRouter from "./groups";
import membersRouter from "./members";
import expensesRouter from "./expenses";
import settlementsRouter from "./settlements";

const router: IRouter = Router();

router.use(healthRouter);
router.use(groupsRouter);
router.use(membersRouter);
router.use(expensesRouter);
router.use(settlementsRouter);

export default router;
