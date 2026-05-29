import { Router, type IRouter } from "express";
import healthRouter from "./health";
import stocksRouter from "./stocks";
import portfolioRouter from "./portfolio";
import chatRouter from "./chat";

const router: IRouter = Router();

router.use(healthRouter);
router.use(stocksRouter);
router.use(portfolioRouter);
router.use(chatRouter);

export default router;
